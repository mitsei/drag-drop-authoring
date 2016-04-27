// Filename: main.js

require.config({
    baseUrl: '/',
    paths: {
        'backbone'              : '//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone-min',
        'bootstrap'             : '//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min',
        'fabric'                : '//cdnjs.cloudflare.com/ajax/libs/fabric.js/1.6.0/fabric.require.min',
        'jquery'                : '//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min',
        'jquery-migrate'        : '//cdnjs.cloudflare.com/ajax/libs/jquery-migrate/1.4.0/jquery-migrate.min',
        'jquery-sidr'           : '//cdnjs.cloudflare.com/ajax/libs/sidr/2.2.1/jquery.sidr.min',
        'jquery-ui-1-10'        : '//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.10.4/jquery-ui.min',
        'underscore'            : '//cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.2/lodash.min'
    },
    shim: {
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'bootstrap': {
            deps: ['jquery', 'jquery-ui-1-10']
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