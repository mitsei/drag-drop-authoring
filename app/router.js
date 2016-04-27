// Filename: router.js
define(['jquery',
        'underscore',
        'backbone'
], function ($, _, Backbone) {
    var AppRouter = Backbone.Router.extend({
        routes: {

            // Default
            '*actions'                      : 'defaultAction'
        }
    });

    var initialize = function () {
        var app_router = new AppRouter;
        app_router.on('route:defaultAction', function (actions) {
            // no configured route
            console.log('No route: ' + actions);
        });
        Backbone.history.start();
    };
    return {
        initialize: initialize
    };
});