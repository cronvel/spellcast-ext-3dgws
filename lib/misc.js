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

const Control = BABYLON.GUI.Control ;



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



misc.positionToAlignment = position => {
	switch ( position ) {
		case 'top':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_CENTER ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_TOP
			} ;
		case 'bottom':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_CENTER ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_BOTTOM
			} ;
		case 'center':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_CENTER ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_CENTER
			} ;
		case 'top-left':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_LEFT ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_TOP
			} ;
		case 'bottom-left':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_LEFT ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_BOTTOM
			} ;
		case 'left':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_LEFT ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_CENTER
			} ;
		case 'top-right':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_RIGHT ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_TOP
			} ;
		case 'bottom-right':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_RIGHT ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_BOTTOM
			} ;
		case 'right':
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_RIGHT ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_CENTER
			} ;
		default:
			return {
				horizontalAlignment: Control.HORIZONTAL_ALIGNMENT_CENTER ,
				verticalAlignment: Control.VERTICAL_ALIGNMENT_CENTER
			} ;
	}
} ;



/*
	Get GUI control position not relative to its parent but to another control.
	Arguments:
		control: the control we want the position
		reference: the control (or the UI) we want the coordinate to be relative to
		*Alignment: the coordinate should be expressed for that type of alignment, default to the control alignment
		origin*: is used to define what origin of the Control is used, if null (default), it depends on the alignment, else:
			- if -1 it's for the left/top side
			- if 1 it's for the right/bottom side
			- if 0 it's for center

	E.g.: if we want the top-left coordinate of a control relative to a reference, for a center alignment, we would do:
	misc.getControlPositionRelativeTo( control , reference , Control.HORIZONTAL_ALIGNMENT_CENTER , Control.VERTICAL_ALIGNMENT_CENTER , -1 , -1 )
*/
misc.getControlPositionRelativeTo = (
	control , reference ,
	horizontalAlignment = control.horizontalAlignment , verticalAlignment = control.verticalAlignment ,
	originX = null , originY = null
) => {
	var left = control._currentMeasure.left - reference._currentMeasure.left ,
		top = control._currentMeasure.top - reference._currentMeasure.top ;
	
	if ( horizontalAlignment === Control.HORIZONTAL_ALIGNMENT_LEFT ) {
		if ( originX === 1 ) {	// right
			left += control._currentMeasure.width ;
		}
		else if ( originX === 0 ) {	// center
			left += control._currentMeasure.width / 2 ;
		}
	}
	else if ( horizontalAlignment === Control.HORIZONTAL_ALIGNMENT_RIGHT ) {
		if ( originX === -1 ) {
			left += - reference._currentMeasure.width ;
		}
		else if ( originX === 0 ) {
			left += - reference._currentMeasure.width + control._currentMeasure.width / 2 ;
		}
		else {	// right or null
			left = - reference._currentMeasure.width + control._currentMeasure.width ;
		}
	}
	else if ( horizontalAlignment === Control.HORIZONTAL_ALIGNMENT_CENTER ) {
		if ( originX === -1 ) {
			left += - reference._currentMeasure.width / 2 ;
		}
		else if ( originX === 1 ) {
			left += - reference._currentMeasure.width / 2 + control._currentMeasure.width ;
		}
		else {	// center or null
			left += ( - reference._currentMeasure.width + control._currentMeasure.width ) / 2 ;
		}
	}
	
	if ( verticalAlignment === Control.VERTICAL_ALIGNMENT_TOP ) {
		if ( originY === 1 ) {
			top += control._currentMeasure.height ;
		}
		else if ( originY === 0 ) {
			top += control._currentMeasure.height / 2 ;
		}
	}
	else if ( verticalAlignment === Control.VERTICAL_ALIGNMENT_BOTTOM ) {
		if ( originY === -1 ) {
			top += - reference._currentMeasure.height ;
		}
		else if ( originY === 0 ) {
			top += - reference._currentMeasure.height + control._currentMeasure.height / 2 ;
		}
		else {	// right or null
			top = - reference._currentMeasure.height + control._currentMeasure.height ;
		}
	}
	else if ( verticalAlignment === Control.VERTICAL_ALIGNMENT_CENTER ) {
		if ( originY === -1 ) {
			top += - reference._currentMeasure.height / 2 ;
		}
		else if ( originY === 1 ) {
			top += - reference._currentMeasure.height / 2 + control._currentMeasure.height ;
		}
		else {	// center or null
			top += ( - reference._currentMeasure.height + control._currentMeasure.height ) / 2 ;
		}
	}
	
	return { left , top } ;
} ;

