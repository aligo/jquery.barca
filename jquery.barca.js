/*
 * jQuery Barca
 *
 * Copyright 2011, aligo Kang
 * http://aligo.me/
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */

(function ( $, undefined ) {


var barca = {

    // Here is barca default settings
    settings : {

        // This text will be displayed in title when loading
        // Set false if you wan't
        loading : 'loading...',

        // This function will called before first ajax request
        // It should be to store original page
        // Returns a function-object that will be called when the history state being activated
        original : function () {
            var origin = $('body').html()
            var title = window.document.title
            return {
              callback : function () {
                  window.document.title = title
                  $('body').html(origin)
              }
            }
        },

        // Fake hashchange event, for handling with the hash in request url
        // Called after ajax request completed
        // You may want that smooth scrolling to an anchor, like this:
        //   function( hash ) {
        //       $('html, body').stop(true).animate( { scrollTop : $( '#' + hash ).offset().top }, 1000 )
        //   }
        hashchange : function ( hash ) { },

        // Whether to use Hashbang mode, set true or keep the default
        useHash : function () {
            if ( !window.history || !window.history.pushState ) return true
            else return false
        },

        // Useful in Hashbang mode, the prefix of url in your site
        baseurl : function () {
            return window.location.protocol + '//' + window.location.host + '/'
        },

        // Don't send a ajax request but push state
        // Notice: success callback would be called with any xhr results
        dontRequest : false
    },

    // Stores the history state objects
    stack : [],

    // Current history state id
    state : 1,

    inited : false,

    // Stores the hashes
    hashStack : [],

    // Called when the history state being activated
    popStack : function ( state_id ) {
        barca.state = state_id
        var state = barca.stack[state_id]
        if ( state && state.callback ) {
            state.callback()
            return true
        }
        return false
    }

}

// Utilities
var u = {
    getValueOrCall : function ( target ) {
        return ( $.isFunction(target) ) ? target() : target
    },

    inArray : function ( elem, array, start ) {
        var start = start || 0
        if ( array.indexOf ) {
            return array.indexOf( elem, start )
        }
        for ( var i = start, length = array.length; i < length; i++ ) {
            if ( array[ i ] === elem ) return i
        }
        return -1
    },

    allInArray : function ( elem, array ) {
        var indices = []
        var idx = u.inArray( elem, array )
        while ( idx !== -1 ) {
            indices.push( idx )
            idx = u.inArray( elem, array, idx+1 )
        }
        return indices
    },

    // Get the pathname & query strings & hashes of a href
    getPath : function ( href ) {
        var dummy = document.createElement('a')
        dummy.href = href
        if ( '/' === dummy.pathname || '' === dummy.pathname ) return '/'
        var idx = href.indexOf( dummy.pathname )
        return href.substring( idx )
    }
}

$.extend({

    barcaSetup : function ( target, settings ) {

        if ( !settings ) {
            settings = target
            target = $.extend( true, barca.settings, settings )
        } else {
            $.extend( true, target, barca.settings, settings )
        }

        for( var field in { context: 1, url: 1 } ) {
            if ( field in settings ) {
                target[ field ] = settings[ field ]
            } else if( field in barca.settings ) {
                target[ field ] = barca.settings[ field ]
            }
        }

        target.href = u.getValueOrCall( target.url )
        var href = target.href.split('#')
        target.url = href[0]
        target.hash = href[1] || undefined

        target.useHash = u.getValueOrCall( target.useHash )
        target.baseurl = u.getValueOrCall( target.baseurl )

        target.loading = target.loading || window.document.title

        return target
    },

    barca : function ( url, options ) {

        if ( typeof url === "object" ) {
            options = url
            url = undefined
        }else{
            options.url = url
        }
        options = options || {}

        var s = jQuery.barcaSetup( {}, options )

        var success = s.success
        s.success = function ( data, status, xhr ){
            var args = arguments
            var state_id = barca.state

            barca.stack[state_id] = {
                callback : function () {
                    if ( s.beforeBarca ) s.beforeBarca()
                    success.apply( this, args )
                    s.hashchange( s.hash )
                }
            }
            barca.stack[state_id].callback()

            if ( !s.useHash ) window.history.replaceState( state_id, window.document.title, window.location.href )

            if ( window._gaq ) _gaq.push( [ '_trackPageview', u.getPath( s.href ) ] )
        }

        if ( !barca.inited ) {
            barca.inited = true
            barca.stack[1] = s.original()
            if ( !s.useHash ) {
                window.history.replaceState( 1, window.document.title, window.location.href )
            } else {
                barca.hashStack[barca.state] = window.location.hash
            }
        }
        barca.state ++
        if ( !s.useHash ) {
            window.history.pushState( barca.state, s.loading, s.href )
        } else {
            if ( 0 === u.inArray( s.baseurl, s.url ) ) {
                var hashstate = s.url.substring( s.baseurl.length )
                if ( '/' !== hashstate.substring( 0, 1 ) ) hashstate = '/' + hashstate
                hashstate = '#!' + hashstate
                if ( undefined !== s.hash ) hashstate = hashstate + '#' + s.hash
                barca.hashStack[barca.state] = hashstate
                barca.hashStack.length = barca.state + 1

                window.location.hash = hashstate
            }
        }
        window.document.title = s.loading

        var xhr = barca.xhr
        if ( xhr && xhr.readyState < 4) {
            xhr.onreadystatechange = $.noop
            xhr.abort()
        }

        if ( s.beforeBarca ) s.beforeBarca()

        if ( !s.dontRequest ) {
            barca.xhr = $.ajax(s)
        } else {
            s.success()
        }
    }
})

if ( -1 === u.inArray( 'state', $.event.props ) ) $.event.props.push('state')

$(window).bind('popstate', function ( event ) {
    var state_id = event.state
    if ( state_id ) {
        barca.popStack( state_id )
    }
})


$(window).bind('hashchange', function () {
    if ( barca.hashStack[barca.state] !== window.location.hash ) {

        var indices = u.allInArray( window.location.hash, barca.hashStack )

        if ( 0 !== indices.length ) {
            indices.sort(function ( a, b ) {
                return Math.abs( a - barca.state ) - Math.abs( b - barca.state )
            })
            barca.popStack( indices[0] )
        }
    }
})

})(jQuery);
