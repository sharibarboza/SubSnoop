'use strict';

/**
 * @ngdoc factory
 * @name tractApp.factory
 * @description
 * # subFactory
 * Factory in the tractApp.
 */
 angular.module('tractApp')
 .factory('subFactory', ['$http', 'userFactory', '$q', 'moment', function ($http, userFactory, $q, moment) {
    var baseUrl = 'http://www.reddit.com/user/';
    var rawJson = 'raw_json=1';
    var username;
    var promise;
    var comments = [];
    var submissions = [];
    var subs = {};
    var pages = 10;

    var resetData = function() {
      // Reset all data to empty lists (used for getting a new user)
      comments = [];
      submissions = [];
      subs = {};
    };

    var getPromise = function(after, where) {
      // Make a GET request to the reddit API to fetch comments or submissions
      if (after === 'first') {
        after = '0';
      }

      var url = baseUrl+username+'/'+where+'.json?'+rawJson+'&after='+after+'&limit=100';
      return $http.get(url);
    };

    var getData = function(response, where) {
      // Push the comment/submission data to their respective lists
      if (response) {
        var after = response.data.data.after;
        var data = response.data.data.children;

        for (var i = 0; i < data.length; i++) {
          if (where === 'comments') {
            comments.push(data[i]);
          } else {
            submissions.push(data[i]);
          }
        }

        if (after) {
          return getPromise(after, where);
        }
      }
      return null;
    };

    var chainPromises = function(where) {
      // Chain promises to fetch all user's comments from reddit API
      var promise = getPromise('first', where);

      for (var i = 0; i < pages; i++) {
        promise = promise.then(function(response) {
          console.log(response);
          return getData(response, where);
        });
      }
      return promise;
    };

    var organizeComments = function(comments) {
      // Organize comments into the subreddits dictionary
      subs = {};
      // Push comments
      for (var i = 0; i < comments.length; i++) {
        var comment = comments[i].data;
        var subreddit = comment.subreddit;
        
        if (subreddit in subs) {
          var comment_list = subs[subreddit].comments;
          var date = moment(comment.created_utc*1000);

          subs[subreddit].comment_ups += parseInt(comment.ups);
          comment_list.push(comment);
          if (date > subs[subreddit].recent_comment) {
            subs[subreddit].recent_comment = date;
          }
        } else {
          subs[subreddit] = {};
          subs[subreddit].comments = new Array(comment);
          subs[subreddit].recent_comment = moment(comment.created_utc*1000);
          subs[subreddit].comment_ups = parseInt(comment.ups);
          subs[subreddit].submissions = [];
          subs[subreddit].submitted_ups = 0;
        }

        subs[subreddit].total_ups = subs[subreddit].comment_ups;
        subs[subreddit].recent_activity = subs[subreddit].recent_comment;
      }
    };

    var organizeSubmitted = function(submissions) {
      // Organize submissions into the subreddits dictionary
      for (var i = 0; i < submissions.length; i++) {
        var submission = submissions[i].data;
        var subreddit = submission.subreddit;

        if (subreddit in subs && subs[subreddit].submissions.length > 0) {
          var submission_list = subs[subreddit].submissions;
          var date = moment(submission.created_utc*1000);
          var recent_submission = subs[subreddit].recent_submission;

          subs[subreddit].submitted_ups += parseInt(submission.ups);
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
          }
          subs[subreddit].submissions.push(submission);
          subs[subreddit].recent_submission = moment(submission.created_utc*1000);
          subs[subreddit].submitted_ups = parseInt(submission.ups);
        }

        if ('recent_comment' in subs[subreddit]) {
          if (subs[subreddit].recent_submission > subs[subreddit].recent_comment) {
            subs[subreddit].recent_activity = subs[subreddit].recent_submission;
          }
          subs[subreddit].total_ups += subs[subreddit].submitted_ups;
        } else {
          subs[subreddit].recent_activity = subs[subreddit].recent_submission;
          subs[subreddit].total_ups = subs[subreddit].submitted_ups;
        }
      }
    };

    return {
      setData: function() {
        // Must be called first before getting comments, submissions, or subs data 
        var userPromise = userFactory.getUser();
        promise = userPromise
        .then(function(response) {
          username = response.data.data.name;
          resetData();
          var commentPromise = chainPromises('comments');
          var submitPromise = chainPromises('submitted');
          return $q.all([commentPromise, submitPromise]);
        }, function(error) {
          console.log('Error fetching data: ' + error);
        });

        promise.then(function() {
          organizeComments(comments);
          organizeSubmitted(submissions);
        });
      },
      getData: function() {
        return promise;
      },
      getCommentList: function() {
        // Returns comments list (getData must be called first to return promise)
        return comments;
      },
      getSubmitList: function() {
        // Returns submissions list (getData must be called first to return promise)
        return submissions;
      },
      getSubs: function() {
        // Returns subreddits dictionary (getData must be called first to return promise)
        return subs;
      }
    };
  }]);