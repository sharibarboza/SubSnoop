'use strict';

/**
 * @ngdoc factory
 * @name SubSnoopApp.factory
 * @description
 * # subFactory
 * Factory in the SubSnoopApp.
 */
 angular.module('SubSnoopApp')
 .factory('subFactory', ['$http', 'userFactory', '$q', 'moment', '$sce', function ($http, userFactory, $q, moment, $sce) {
    var baseUrl = 'https://www.reddit.com/user/';
    var rawJson = 'raw_json=1';
    var username;
    var promise;
    var comments = [];
    var submissions = [];
    var subs = {};
    var pages = 10;
    var dataAvailable;

    var commentData = [];
    var submitData = [];
    var after = "0";

    var subsData = {};

    /*
     Reset all data to empty lists (used for getting a new user)
    */
    var resetData = function() {
      comments = [];
      submissions = [];
      subs = {};
      commentData = [];
      submitData = [];
      after = '0';
    };

    var buildComment = function(comment) {
      var data = {};

      data.type = 'comment';
      data.id = comment.id;
      data.subreddit = comment.subreddit;
      data.created_utc = comment.created_utc;
      data.ups = comment.ups;
      data.link_title = comment.link_title;
      data.link_author = comment.link_author;
      data.link_url = comment.link_url;
      data.body = comment.body;
      data.body_html = comment.body_html;
      data.link_permalink = comment.link_permalink;
      data.gilded = comment.gilded;
      data.num_comments = comment.num_comments;

      return data;
    };

    var buildSubmit = function(submit) {
      var data = {};

      data.type = 'submit';
      data.id = submit.id;
      data.subreddit = submit.subreddit;
      data.created_utc = submit.created_utc;
      data.url = submit.url;
      data.title = submit.title;
      data.link_flair_text = submit.link_flair_text;
      data.html = submit.html;
      data.ups = submit.ups;
      data.num_comments = submit.num_comments;
      data.selftext = submit.selftext;
      data.selftext_html = submit.selftext_html;
      data.thumbnail = submit.thumbnail;
      data.thumbnail_width = submit.thumbnail_width;
      data.media = submit.media;
      data.preview = submit.preview;
      data.permalink = submit.permalink;
      data.gilded = submit.gilded;

      return data;
    };

    /*
     Grabs the comments and store them in their respective sub object
     as well as other statistics
    */
    var organizeComments = function(comments) {
      subs = {};
      // Push comments
      for (var i = 0; i < comments.length; i++) {
        var comment = comments[i];
        var subreddit = comment.subreddit;
        var ups = parseInt(comment.ups);
        
        if (subreddit in subs) {
          var comment_list = subs[subreddit].comments;
          var date = moment(comment.created_utc*1000);

          subs[subreddit].comment_ups += ups;

          comment_list.push(comment);
          if (date > subs[subreddit].recent_comment) {
            subs[subreddit].recent_comment = date;
          }
        } else {
          subs[subreddit] = {};
          subs[subreddit].comments = new Array(comment);
          subs[subreddit].recent_comment = moment(comment.created_utc*1000);
          subs[subreddit].comment_ups = ups;
          subs[subreddit].submissions = [];
          subs[subreddit].submission_ups = 0;
          subs[subreddit].gilded_comments = 0;
          subs[subreddit].gilded_submissions = 0;
          subs[subreddit].count = 0;
        }

        if (comment.gilded > 0) {
          subs[subreddit].gilded_comments += 1;
        }

        subs[subreddit].count += 1;
        subs[subreddit].recent_activity = subs[subreddit].recent_comment;
      }
    };

    /*
     Grabs submissions and stores them in their respective sub object
    */
    var organizeSubmitted = function(submissions) {
      for (var i = 0; i < submissions.length; i++) {
        var submission = submissions[i];
        var subreddit = submission.subreddit;
        var ups = parseInt(submission.ups);

        if (subreddit in subs && subs[subreddit].submissions.length > 0) {
          var submission_list = subs[subreddit].submissions;
          var date = moment(submission.created_utc*1000);
          var recent_submission = subs[subreddit].recent_submission;

          subs[subreddit].submission_ups += ups;

          submission_list.push(submission);
          if (date > recent_submission) {
            subs[subreddit].recent_submission = date;
          }
        } else {
          if (!(subreddit in subs)) {
            subs[subreddit] = {};
            subs[subreddit].submissions = [];
            subs[subreddit].comments = [];
            subs[subreddit].comment_ups = 0;
            subs[subreddit].gilded_submissions = 0;
            subs[subreddit].count = 0;
          } 
          subs[subreddit].submissions.push(submission);
          subs[subreddit].recent_submission = moment(submission.created_utc*1000);
          subs[subreddit].submission_ups = ups;
        }

        if (submission.gilded > 0) {
          subs[subreddit].gilded_submissions += 1;
        }

        if ('recent_comment' in subs[subreddit]) {
          if (subs[subreddit].recent_submission > subs[subreddit].recent_comment) {
            subs[subreddit].recent_activity = subs[subreddit].recent_submission;
          }
        } else {
          subs[subreddit].recent_activity = subs[subreddit].recent_submission;
        }

        subs[subreddit].count += 1;
      }
    };

    /*
     Get the combined total of comment and submission upvotes
    */
    var setTotalUps = function() {
      for (var sub in subs) {
        subs[sub].total_ups = subs[sub].comment_ups + subs[sub].submission_ups;
      }
    };

    /*
     Get the date of the first post
    */
    var getFirstDate = function() {
      var lastComment, lastSubmit, commentDate, submitDate;

      if (comments.length > 0) {
        lastComment = comments[comments.length-1];
        commentDate = moment(lastComment.created_utc*1000);
      }

      if (submissions.length > 0) {
        lastSubmit = submissions[submissions.length-1];
        submitDate = moment(lastSubmit.created_utc*1000);
      }

      if (commentDate && submitDate) {
        dataAvailable = (commentDate < submitDate) ? commentDate : submitDate;
      } else if (commentDate) {
        dataAvailable = commentDate;
      } else if (submitDate) {
        dataAvailable = submitDate;
      } 
    };

    /*
     Get the most recent posts (whether they be comment or submission)
    */
    var getLatest = function(num) {
      var latest = [];
      var comment_index = 0;
      var submit_index = 0;
      var comment, submit, comment_date, submit_date;

      while (latest.length < num && comment_index <= comments.length && submit_index <= submissions.length) {
        if (comments.length > comment_index) {
          comment = comments[comment_index];
          comment_date = moment(comment.created_utc*1000);
        } else {
          comment = null;
        }

        if (submissions.length > submit_index) {
          submit = submissions[submit_index];
          submit_date = moment(submit.created_utc*1000);
        } else {
          submit = null;
        }

        /* 
          When a comment or submission is pushed, increase the index, otherwise keep
          the index where it is to compare with the next item.
        */
        if (comment && submit) {
          if (comment_date > submit_date) {
            latest.push(comment);
            comment_index += 1;
          } else {
            latest.push(submit);
            submit_index += 1;
          }
        } else if (comment && !submit) {
          latest.push(comment);
          comment_index += 1;
        } else if (!comment && submit) {
          latest.push(submit);
          submit_index += 1;
        } else {
          // Not enough comments and submissions
          break;
        }
      }

      return latest;
    };

    /*
     Callback function to fetch data from user's comments
    */
    window.commentsCallback = function(response) {
      commentData.push(response.data.children);
      after = response.data.after;
      pushData(response.data, 'comments');
    }

    /*
     Callback function to fetch data from user's submissions
    */
    window.submitsCallback = function(response) {
      submitData.push(response.data.children);
      after = response.data.after;
      pushData(response.data, 'submits');
    }

    /*
     Push the comment/submission data to their respective lists
    */
    var pushData = function(response, where) {
      if (response) {
        var data = response.children;
        for (var i = 0; i < data.length; i++) {
          if (where === 'comments') {
            var comment = buildComment(data[i].data);
            comments.push(comment);
          } else {
            var submission = buildSubmit(data[i].data);
            submissions.push(submission);
          }
        }
      }
    };

    var getDataList = function(where) {
      return where === 'comments' ? commentData : submitData;
    }

    /*
     Resolve promise and return data if there is no more requests.
     If there is still an after value, chain the next promise.
    */
    var getPromise = function(where, callback, promise, index) {
      var promise = promise.then(function() {
        return getDataList(where);
      }, function() {
        if (index === pages-1) {
          return getDataList(where);
        } else {
          return after ? getJSONP(where, callback) : getDataList(where);
        }
      });
      return promise;
    };

    /*
     Chain data promises for fetching comments or submissions.
     Reddit API caps at 1000 comments and submisions each. Only 100 items can be
     fetched at a time, making for at most 10 API requests.
    */
    var promiseChain = function(where, callback) {
      var promise = getJSONP(where, callback);
      for (var i = 0; i < pages; i++) {
        promise = getPromise(where, callback, promise, i);
      }
      return promise;
    };

    /*
     Make the http request to the Reddit API using JSONP.
    */
    var getJSONP = function(where, callback) {
      var url = 'https://www.reddit.com/user/'+username+'/'+where+'.json?limit=100&after='+after+'&jsonp='+callback;
      var trustedUrl =  $sce.trustAsResourceUrl(url);
      return $http.jsonp(trustedUrl);
    }

    /*
     Configure sub data object, which will be passed to the controllers.
    */
    var getSubData = function(response) {
      organizeComments(comments);
      organizeSubmitted(submissions);
      setTotalUps();

      getFirstDate();
      var subData = {
        'user': response,
        'comments' : comments.length,
        'submissions' : submissions.length,
        'subs' : subs,
        'firstDate' : dataAvailable,
        'latest' : getLatest(2)
      }
      cacheData(subData, response);
      return subData;
    };

    /*
     Save data in session storage.
    */
    var cacheData = function(data, user) {
      sessionStorage.user = username;
      sessionStorage.subData = JSON.stringify(data);
    };

    return {
      getData: function(user) {
        username = user;
        resetData();

        /*
         Only if user promise resolves, then do promise chaining for comments and
         submissions asynchronously
        */
        var userPromise = userFactory.getData(user);
        var testPromise = userPromise.then(function(response) {

          if (response !== "") {
            var commentPromise = promiseChain('comments', 'commentsCallback');
            var submitPromise = promiseChain('submitted', 'submitsCallback');

            // Resolve both comment and submission promises together
            var dataPromise = $q.all([commentPromise, submitPromise]).then(function() {
              return getSubData(response);
            });
            return dataPromise;
          } else {
            return "";
          }
        });
        return testPromise;
      },
      setSubs: function(data) {
        subsData = data;
      },
      getSubs: function() {
        return subsData;
      },
      getDefaultSort: function() {
        return {value: 'subName', name: 'Subreddit name'};
      }
    };
  }]);