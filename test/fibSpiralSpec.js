  describe("Unit testing fibonacci spiral", function() {
    var element;
    var compile;
    var directiveElement;
    var outerScope;
    var innerScope;

    beforeEach(function() {
//      angular.mock.module('fibonacci', []);
      module('fibonacci');

      inject(function( $compile, $rootScope ) {
        compile = $compile;
        outerScope = $rootScope.$new();
      });

      directiveElement = getCompiledElement();
    });

    function getCompiledElement() {
      element = angular.element('<div><div fibonacci></div></div>');
      var compiledElement = compile(element)(outerScope);
      innerScope = element.isolateScope();
      outerScope.$digest();
      return compiledElement;
    }

    it("should be defined", function() {
      expect(element[0]).toBeDefined();
    });

    it("should match a canvas tag", function() {
      expect(element[0].innerHTML).toMatch(/<canvas.*<\/canvas>/);
    });

  });
