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

