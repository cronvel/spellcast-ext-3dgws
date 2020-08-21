/*
	3D Ground With Sprites

	Copyright (c) 2020 Cédric Ronvel

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



const Babylon = require( 'babylonjs' ) ;



exports.cameraRotationFromOriginAndTarget = ( origin , target , rz = 0 ) => {
	var x = target.x - origin.x ,
		y = target.y - origin.y ,
		z = target.z - origin.z ,
		// usually atan2( y , x ), but since it's Y-up, z is used instead of y, and since (0,0,0) rotation for camera
		// means looking toward +z, we need a Pi/2 compasation, and it looks like sign is reverted (leftHanded?),
		// so after all, x and z are switched
		ry = Math.atan2( x , z ) ,
		// rx is reversed too
		rx = - exports.epsilonAsin( y / Math.hypot( x , y , z ) ) ;
	
	console.warn( "[!] .rotationFromOriginAndTarget()" , origin , target , x , y , z , ry ) ;
	return new Babylon.Vector3( rx , ry , rz ) ;
} ;



// Extracted from the math-kit module:

exports.RAD_TO_DEG = 180 / Math.PI ;
exports.DEG_TO_RAD = Math.PI / 180 ;
exports.PI_2 = Math.PI / 2 ;

// Fixed (absolute) epsilon (not relative to the exposant, because it's faster to compute)
// EPSILON and INVERSE_EPSILON are private
var EPSILON = 0.0000000001 ;
var INVERSE_EPSILON = Math.round( 1 / EPSILON ) ;
exports.setEpsilon = e => { EPSILON = e ; INVERSE_EPSILON = Math.round( 1 / e ) ; } ;
exports.getEpsilon = () => EPSILON ;



// Math.acos() return NaN if input is 1.0000000000000001 due to rounding, this try to fix that
exports.epsilonAcos = exports.eacos = v => {
	if ( v >= -1 && v <= 1 ) { return Math.acos( v ) ; }

	if ( v > 0 ) {
		if ( v < 1 + EPSILON ) { return 0 ; }
	}
	else if ( v > -1 - EPSILON ) { return Math.PI ; }

	return NaN ;
} ;



// Same for arc sinus
exports.epsilonAsin = exports.easin = v => {
	if ( v >= -1 && v <= 1 ) { return Math.asin( v ) ; }

	if ( v > 0 ) {
		if ( v < 1 + EPSILON ) { return Math.PI / 2 ; }
	}
	else if ( v > -1 - EPSILON ) { return Math.PI / 2 ; }

	return NaN ;
} ;
