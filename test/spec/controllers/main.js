'use strict';

describe('Controller: MainCtrl', function () {

  // load the controller's module
  beforeEach(module('tractApp'));

  var MainCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    MainCtrl = $controller('MainCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should complete processing', function () {
    expect(scope.processing).toBe(false);
  });
});
