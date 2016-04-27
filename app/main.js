// Filename: main.js

require.config({
    baseUrl: '/',
    paths: {
        'backbone'              : '//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone-min',
        'bootstrap'             : '//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min',
        'fabric'                : '//cdnjs.cloudflare.com/ajax/libs/fabric.js/1.6.0/fabric.min.js',
        'jquery'                : '//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js',
        'jquery-migrate'        : '//cdnjs.cloudflare.com/ajax/libs/jquery-migrate/1.2.1/jquery-migrate.min.js',
        'jquery-sidr'           : 'vendor/jquery.sidr',
        'jquery-ui-1-10'        : 'vendor/jquery-ui-1.10.4/jqueryui',
        'underscore'            : '//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.11.2/lodash.min.js'
    },
    shim: {
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'bootstrap': {
            deps: ['jquery', 'jquery-ui-1-10/button']
        },
        'fabric': {
            exports: 'fabric'
        },
        'jquery-migrate': {
            deps: ['jquery']
        },
        'jquery-sidr': {
            deps: ['jquery']
        },
        'jquery-ui-1-10': {
            deps: ['jquery']
        }
    }
});

require(['app'], function(App) {
    App.initialize();
    require(['views/assessments/drag_drop']);
});