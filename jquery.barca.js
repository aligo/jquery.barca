/*
 * jQuery Barca
 *
 * Copyright 2011, aligo Kang
 * http://aligo.me/
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */

(function($, undefined){

$.extend({

    barcaStatus : {},

    barcaSetup : function ( target, settings ) {

		if ( !settings ) {
			settings = target
			target = $.extend( true, $.barcaSettings, settings )
		} else {
			$.extend( true, target, $.barcaSettings, settings )
		}

		for( var field in { context: 1, url: 1 } ) {
			if ( field in settings ) {
				target[ field ] = settings[ field ]
			} else if( field in $.barcaSettings ) {
				target[ field ] = $.barcaSettings[ field ]
			}
		}

        if ( $.isFunction(target.url) ) {
            target.href = target.url()
        }else{
            target.href = target.url
        }
        var href = target.url.split('#')
        target.url = href[0]
        target.hash = href[1] || undefined

		return target
	},

    barcaSettings : {
        loading : 'loading...',
        barcaOriginal : function() {
            var origin = $('body').html()
            return {
              callback : function() {
                  $('body').html(origin)
              }
            }
        },
        hashchange : function( new_hash, old_hash ) {
        }
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

        var old_hash = window.location.hash

        var success = s.success
        s.success = function(data, status, xhr){
            var args = arguments
            var state_id = window.history.state

            $.barcaStatus[state_id] = {
                callback : function() {
                    success.apply(this, args)
                    s.hashchange(s.hash, old_hash)
                }
            }
            $.barcaStatus[state_id].callback()

            window.history.replaceState(state_id, document.title, window.location.href)

            if (window._gaq){
                _gaq.push(['_trackPageview'])
            }
        }

        var xhr = $.barca.xhr
        if ( xhr && xhr.readyState < 4) {
            xhr.onreadystatechange = $.noop
            xhr.abort()
        }

        $.barca.xhr = $.ajax(s)

        if ( !$.barca.active ) {
            $.barca.state = 1
            $.barca.active = true
            $.barcaStatus[1] = s.barcaOriginal()
            window.history.replaceState(1, document.title, window.location.href)
        }
        $.barca.state ++
        window.history.pushState($.barca.state, s.loading, s.href)
        document.title = s.loading
    }
})


if ( $.event.props.indexOf('state') < 0 ) $.event.props.push('state')

$(window).bind('popstate', function( event ) {
    var state_id = event.state
    if ( state_id ) {
        $.barca.state = state_id
        var state = $.barcaStatus[state_id]
        if ( state && state.callback ) {
            state.callback()
            succ = true
        }
    }
    if ( !succ ) window.location = event.href
})

})(jQuery);