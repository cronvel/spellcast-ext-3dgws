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



exports.getUpmostBoxMeshFace = boxMesh => {
	var quat = boxMesh.rotationQuaternion ;
	var r = new BABYLON.Vector3( 0 , 0 , 0 ) ;

	BABYLON.Vector3.Right().rotateByQuaternionToRef( quat , r ) ;
	if ( r.y >= Math.SQRT1_2 ) {
		// +X is up, it is face #2
		return 2 ;
	}
	else if ( r.y <= -Math.SQRT1_2 ) {
		// -X is up, it is face #3
		return 3 ;
	}

	BABYLON.Vector3.Up().rotateByQuaternionToRef( quat , r ) ;
	if ( r.y >= Math.SQRT1_2 ) {
		// +Y is up, it is face #4
		return 4 ;
	}
	else if ( r.y <= -Math.SQRT1_2 ) {
		// -Y is up, it is face #5
		return 5 ;
	}

	BABYLON.Vector3.Forward().rotateByQuaternionToRef( quat , r ) ;
	if ( r.y >= Math.SQRT1_2 ) {
		// +Z is up, it is face #0
		return 0 ;
	}
	else if ( r.y <= -Math.SQRT1_2 ) {
		// -Z is up, it is face #1
		return 1 ;
	}

	return 0 ;
} ;

