/*
 * jQuery Barca
 *
 * Copyright 2011, aligo Kang
 * http://aligo.me/
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */

(function($, undefined) {

var barca = {

    settings : {
        loading : 'loading...',
        original : function() {
            var origin = $('body').html()
            return {
              callback : function() {
                  $('body').html(origin)
              }
            }
        },
        hashchange : function( new_hash ) { },
        useHash : function() {
            if ( !window.history || !window.history.pushState ) return true
            else return false
        },
        baseurl : function() {
            return window.location.protocol + '//' + window.location.host + '/'
        }
    },

    stack : [],

    state : 1,

    inited : false,

    hashStack : [],

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

var getValueOrCall = function ( target ) {
    return ( $.isFunction(target) ) ? target() : target
}

var inArray = function( elem, array, start ) {
    var start = start || 0
    if ( array.indexOf ) {
        return array.indexOf( elem, start )
    }
    for ( var i = start, length = array.length; i < length; i++ ) {
        if ( array[ i ] === elem ) return i
    }
    return -1
}

var allInArray = function( elem, array ) {
    var indices = []
    var idx = inArray( elem, array )
    while ( idx !== -1 ) {
        indices.push( idx )
        idx = inArray( elem, array, idx+1 )
    }
    return indices
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

        target.href = getValueOrCall( target.url )
        var href = target.href.split('#')
        target.url = href[0]
        target.hash = href[1] || undefined

        target.useHash = getValueOrCall( target.useHash )
        target.baseurl = getValueOrCall( target.baseurl )

		return target
	},


    barca : function( url, options ) {

        if ( typeof url === "object" ) {
            options = url
            url = undefined
        }else{
            options.url = url
        }
        options = options || {}

        var s = jQuery.barcaSetup( {}, options )

        var success = s.success
        s.success = function(data, status, xhr){
            var args = arguments
            var state_id = barca.state

            barca.stack[state_id] = {
                callback : function() {
                    success.apply( this, args )
                    s.hashchange( s.hash )
                }
            }
            barca.stack[state_id].callback()

            if ( !s.useHash ) window.history.replaceState( state_id, document.title, window.location.href )

            if (window._gaq) _gaq.push( ['_trackPageview', s.href] )
        }

        if ( !barca.inited ) {
            barca.inited = true
            barca.stack[1] = s.original()
            if ( !s.useHash ) {
                window.history.replaceState( 1, document.title, window.location.href )
            } else {
                barca.hashStack[barca.state] = window.location.hash
            }
        }
        barca.state ++
        if ( !s.useHash ) {
            window.history.pushState( barca.state, s.loading, s.href )
        } else {
            if ( 0 === inArray( s.baseurl, s.url ) ) {
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

        barca.xhr = $.ajax(s)
    }
})

if ( -1 === inArray( 'state', $.event.props ) ) $.event.props.push('state')

$(window).bind('popstate', function( event ) {
    var state_id = event.state
    if ( state_id ) {
        barca.popStack( state_id )
    }
})


$(window).bind('hashchange', function() {
    if ( barca.hashStack[barca.state] !== window.location.hash ) {

        var indices = allInArray( window.location.hash, barca.hashStack )

        if ( 0 !== indices.length ) {
            indices.sort(function( a, b ) {
                return Math.abs( a - barca.state ) - Math.abs( b - barca.state )
            })
            barca.popStack( indices[0] )
        }
    }
})

})(jQuery);
