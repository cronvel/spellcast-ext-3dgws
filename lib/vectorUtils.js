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



const utils = {} ;
module.exports = utils ;



const DEG_0 = 0 ,	// n
	DEG_22_5 = Math.PI / 8 ,
	DEG_45 = Math.PI / 4 ,	// nw
	DEG_90 = Math.PI / 2 ,	// w
	DEG_135 = Math.PI * 3 / 4 ,	// sw
	DEG_180 = Math.PI ,	// s
	DEG_225 = Math.PI * 5 / 4 ,	// se
	DEG_270 = Math.PI * 3 / 2 ,	// e
	DEG_315 = Math.PI * 7 / 4 ,	// ne
	DEG_360 = 2 * Math.PI ;



// Angle between two vectors projected on the ground plane, return ]-PI;+PI]
utils.flatVectorsAngleRad = ( base , vector ) => utils.normalizeAngleRad(
	( Math.atan2( -vector.x , vector.z ) - Math.atan2( -base.x , base.z ) )
) ;



// The facing angle of an object relative to the camera, return ]-180;+180]
utils.facingAngleRad = ( cameraPosition , objectPosition , facing ) => utils.normalizeAngleRad(
	facing
	- Math.atan2( -( objectPosition.x - cameraPosition.x ) , objectPosition.z - cameraPosition.z )
) ;



utils.radToSector = {} ;
utils.radToSector['ns'] = angle => angle <= DEG_90 || angle >= DEG_270 ? 'n' : 's' ;
utils.radToSector['we'] = angle => angle <= DEG_180 ? 'w' : 'e' ;

const SECTOR_8 = [ 'n' , 'nw' , 'w' , 'sw' , 's' , 'se' , 'e' , 'ne' , 'n' ] ;
utils.radToSector['8'] = angle => SECTOR_8[ Math.floor( ( angle + DEG_22_5 ) / DEG_45 ) ] ;

const SECTOR_4 = [ 'n' , 'w' , 's' , 'e' , 'n' ] ;
utils.radToSector['4'] = angle => SECTOR_4[ Math.floor( ( angle + DEG_45 ) / DEG_90 ) ] ;

const SECTOR_4_DIAG = [ 'nw' , 'sw' , 'se' , 'ne' ] ;
utils.radToSector['4-diag'] = angle => SECTOR_4_DIAG[ Math.floor( angle / DEG_90 ) ] ;

utils.xFlipSector = {
	n: 'n' , ne: 'nw' , e: 'w' , se: 'sw' , s: 's' , sw: 'se' , w: 'e' , nw: 'ne'
} ;



utils.cameraRotationFromOriginAndTarget = ( origin , target , rz = 0 ) => {
	var x = target.x - origin.x ,
		y = target.y - origin.y ,
		z = target.z - origin.z ,
		// usually atan2( y , x ), but since it's Y-up, z is used instead of y, and since (0,0,0) rotation for camera
		// means looking toward +z, we need a Pi/2 compensation, and it looks like sign is reverted (leftHanded?),
		// so after all, x and z get switched
		ry = Math.atan2( x , z ) ,
		// rx is reversed too
		rx = -utils.epsilonAsin( y / Math.hypot( x , y , z ) ) ;

	console.warn( "[!] .rotationFromOriginAndTarget()" , origin , target , x , y , z , ry ) ;
	return new BABYLON.Vector3( rx , ry , rz ) ;
} ;



// Orbital camera alpha and beta angles
utils.toCameraAlpha = yaw => -utils.PI_2 - yaw ;	// * utils.DEG_TO_RAD ;
utils.toCameraBeta = pitch => utils.PI_2 - pitch ;	// * utils.DEG_TO_RAD ;



// Extracted from the math-kit module:

utils.RAD_TO_DEG = 180 / Math.PI ;
utils.DEG_TO_RAD = Math.PI / 180 ;
utils.PI_2 = Math.PI / 2 ;



// Return an angle between [0;2pi[
utils.normalizeAngleRad = a => a >= DEG_0 ? a % DEG_360 : DEG_360 + a % DEG_360 ;



// Fixed (absolute) epsilon (not relative to the exposant, because it's faster to compute)
// EPSILON and INVERSE_EPSILON are private
var EPSILON = 0.0000000001 ;
var INVERSE_EPSILON = Math.round( 1 / EPSILON ) ;
utils.setEpsilon = e => { EPSILON = e ; INVERSE_EPSILON = Math.round( 1 / e ) ; } ;
utils.getEpsilon = () => EPSILON ;



// Math.acos() return NaN if input is 1.0000000000000001 due to rounding, this try to fix that
utils.epsilonAcos = utils.eacos = v => {
	if ( v >= -1 && v <= 1 ) { return Math.acos( v ) ; }

	if ( v > 0 ) {
		if ( v < 1 + EPSILON ) { return 0 ; }
	}
	else if ( v > -1 - EPSILON ) { return Math.PI ; }

	return NaN ;
} ;



// Same for arc sinus
utils.epsilonAsin = utils.easin = v => {
	if ( v >= -1 && v <= 1 ) { return Math.asin( v ) ; }

	if ( v > 0 ) {
		if ( v < 1 + EPSILON ) { return Math.PI / 2 ; }
	}
	else if ( v > -1 - EPSILON ) { return Math.PI / 2 ; }

	return NaN ;
} ;

