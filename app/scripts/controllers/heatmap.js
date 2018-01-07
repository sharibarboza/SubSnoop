'use strict';

/**
 * @ngdoc function
 * @name SubSnoopApp.controller:HeatmapCtrl
 * @description
 * # HeatmapCtrl
 * Controller of the SubSnoopApp
 */
angular.module('SubSnoopApp')
  .controller('HeatmapCtrl', ['$scope', '$routeParams', 'heatmap', 'moment', 'subFactory', function ($scope, $routeParams, heatmap, moment, subFactory) {
    $scope.subreddit = $routeParams.subreddit;
    var subs = subFactory.getSubData().subs;

    $scope.mapData = heatmap.getMap(subs[$scope.subreddit], null);
  }]);
