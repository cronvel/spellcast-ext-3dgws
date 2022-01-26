/*
	3D Ground With Sprites

	Copyright (c) 2020 - 2021 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const extension = require( './browser-extension.js' ) ;



const misc = {} ;
module.exports = misc ;



misc.getContrastColorCode = ( colorStr , rate = 0.5 ) => {
	var color = extension.host.exports.toolkit.hexToRgb( colorStr ) ;

	if ( color.r + color.g + color.b >= 192 ) {
		// This is a light color, we will contrast it with a darker color
		color.r = Math.round( color.r * rate ) ;
		color.g = Math.round( color.g * rate ) ;
		color.b = Math.round( color.b * rate ) ;
	}
	else {
		// This is a dark color, we will contrast it with a lighter color
		color.r = Math.round( 255 - ( ( 255 - color.r ) * rate ) ) ;
		color.g = Math.round( 255 - ( ( 255 - color.g ) * rate ) ) ;
		color.b = Math.round( 255 - ( ( 255 - color.b ) * rate ) ) ;
	}

	return extension.host.exports.toolkit.rgbToHex( color ) ;
} ;



misc.scaleSizeString = ( size , rate ) => {
	if ( typeof size === 'number' ) { return size * rate ; }
	if ( typeof size !== 'string' ) { throw new TypeError( "scaleSizeString: bad type: " + ( typeof size ) ) ; }
	if ( size.endsWith( "px" ) ) { return Math.round( parseInt( size , 10 ) * rate ) + "px" ; }
	return parseInt( size , 10 ) * rate ;
} ;



misc.addToSizeString = ( size , add ) => {
	if ( typeof size === 'number' ) { return size + add ; }
	if ( typeof size !== 'string' ) { throw new TypeError( "addToSizeString: bad type: " + ( typeof size ) ) ; }
	if ( size.endsWith( "px" ) ) { return Math.round( parseInt( size , 10 ) + add ) + "px" ; }
	return parseInt( size , 10 ) + add ;
} ;



// Get GUI control position not relative to its parent but to another ancestor
misc.getControlPositionRelativeTo = ( control , reference , horizontal = null , vertical = null ) => {
	var Control = BABYLON.GUI.Control ,
		left = control._currentMeasure.left - reference._currentMeasure.left ,
		top = control._currentMeasure.top - reference._currentMeasure.top ;
	
	if ( reference.horizontalAlignment === Control.HORIZONTAL_ALIGNMENT_LEFT ) {
		if ( horizontal === Control.HORIZONTAL_ALIGNMENT_RIGHT ) {
			left += control._currentMeasure.width ;
		}
		else if ( horizontal === Control.HORIZONTAL_ALIGNMENT_CENTER ) {
			left += control._currentMeasure.width / 2 ;
		}
	}
	else if ( reference.horizontalAlignment === Control.HORIZONTAL_ALIGNMENT_RIGHT ) {
		if ( horizontal === Control.HORIZONTAL_ALIGNMENT_LEFT ) {
			left += - reference._currentMeasure.width ;
		}
		else if ( horizontal === Control.HORIZONTAL_ALIGNMENT_CENTER ) {
			left += - reference._currentMeasure.width + control._currentMeasure.width / 2 ;
		}
		else {	// right or null
			left = - reference._currentMeasure.width + control._currentMeasure.width ;
		}
	}
	else if ( reference.horizontalAlignment === Control.HORIZONTAL_ALIGNMENT_CENTER ) {
		if ( horizontal === Control.HORIZONTAL_ALIGNMENT_LEFT ) {
			left += - reference._currentMeasure.width / 2 ;
		}
		else if ( horizontal === Control.HORIZONTAL_ALIGNMENT_RIGHT ) {
			left += - reference._currentMeasure.width / 2 + control._currentMeasure.width ;
		}
		else {	// center or null
			left += ( - reference._currentMeasure.width + control._currentMeasure.width ) / 2 ;
		}
	}
	
	if ( reference.verticalAlignment === Control.VERTICAL_ALIGNMENT_LEFT ) {
		if ( vertical === Control.VERTICAL_ALIGNMENT_RIGHT ) {
			top += control._currentMeasure.height ;
		}
		else if ( vertical === Control.VERTICAL_ALIGNMENT_CENTER ) {
			top += control._currentMeasure.height / 2 ;
		}
	}
	else if ( reference.verticalAlignment === Control.VERTICAL_ALIGNMENT_RIGHT ) {
		if ( vertical === Control.VERTICAL_ALIGNMENT_LEFT ) {
			top += - reference._currentMeasure.height ;
		}
		else if ( vertical === Control.VERTICAL_ALIGNMENT_CENTER ) {
			top += - reference._currentMeasure.height + control._currentMeasure.height / 2 ;
		}
		else {	// right or null
			top = - reference._currentMeasure.height + control._currentMeasure.height ;
		}
	}
	else if ( reference.verticalAlignment === Control.VERTICAL_ALIGNMENT_CENTER ) {
		if ( vertical === Control.VERTICAL_ALIGNMENT_LEFT ) {
			top += - reference._currentMeasure.height / 2 ;
		}
		else if ( vertical === Control.VERTICAL_ALIGNMENT_RIGHT ) {
			top += - reference._currentMeasure.height / 2 + control._currentMeasure.height ;
		}
		else {	// center or null
			top += ( - reference._currentMeasure.height + control._currentMeasure.height ) / 2 ;
		}
	}
	
	return { left , top } ;
} ;

