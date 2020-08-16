/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

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
const GTransition = require( './GTransition.js' ) ;
const vectorUtils = require( './vectorUtils.js' ) ;
//const domKit = require( 'dom-kit' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE Camera! spellcast/lib/gfx/Camera.js
function Camera( gScene , data ) {
	this.gScene = gScene ;    // immutable

	this.position = { x: 0 , y: 0 , z: 10 } ;
	this.target = { x: 0 , y: 0 , z: 0 } ;
	this.roll = 0 ;
	this.fov = 90 ;
	this.perspective = 1 ;
	this.free = false ;
	this.trackingMode = null ;

	// Babylon stuffs
	this.babylon = {
		camera: null
	} ;
	
	this.babylon.camera = new Babylon.FreeCamera(
		'Camera' ,
		new Babylon.Vector3( this.position.x , this.position.y , this.position.z ) ,
		this.gScene.babylon.scene
	) ;
	
	this.babylon.camera.setTarget( new Babylon.Vector3( this.target.x , this.target.y , this.target.z ) ) ;

	// Make the canvas events control the camera
	this.babylon.camera.attachControl( this.gScene.$gscene , true ) ;

	// Make the mouse wheel move less
	//this.babylon.camera.wheelPrecision = 20 ;
}

module.exports = Camera ;



// !THIS SHOULD TRACK SERVER-SIDE Camera! spellcast/lib/gfx/Camera.js
Camera.prototype.update = function( data ) {
    console.warn( "3D Camera.update()" , data ) ;
	var camera = this.babylon.camera ,
		scene = this.gScene.babylon.scene ;

	if ( data.transition ) { data.transition = new GTransition( data.transition ) ; }

	if ( data.position || data.target || data.roll !== undefined ) {
		let oldPosition = this.position ;

		if ( data.position ) { this.position = data.position ; }
		if ( data.target ) { this.target = data.target ; }
		if ( data.roll !== undefined ) { this.roll = data.roll ; }
		
		// I found out that rotation can't be animated properly without quaternion,
		// so even if the new value is computed in Euler YXZ, it is translated into quaternion for the animation.
		let newRotation = vectorUtils.cameraRotationFromOriginAndTarget( this.position , this.target , this.roll * vectorUtils.DEG_TO_RAD ) ;
		let newRotationQuaternion = Babylon.Quaternion.FromEulerVector( newRotation ) ;

		if ( data.transition ) {
			let oldRotation = camera.rotationQuaternion ? camera.rotationQuaternion.toEulerAngles() : camera.rotation.clone() ,
				oldRotationQuaternion = Babylon.Quaternion.FromEulerVector( oldRotation ) ;

			console.warn( "[!] camera transition:" , camera , oldRotation , newRotation , oldRotationQuaternion ) ;

			if ( data.position ) {
				data.transition.createAnimation(
					scene ,
					camera ,
					'position' ,
					Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
					new Babylon.Vector3( this.position.x , this.position.y , this.position.z )
				) ;
			}
			
			// rotation is *ALWAYS* changed
			
			data.transition.createAnimation(
				scene ,
				camera ,
				'rotationQuaternion' ,
				Babylon.Animation.ANIMATIONTYPE_QUATERNION ,
				newRotationQuaternion ,
				oldRotationQuaternion
			) ;
		}
		else {
			console.warn( "[!] camera direct:" , camera , newRotation ) ;
			if ( data.position ) {
				camera.position = new Babylon.Vector3( this.position.x , this.position.y , this.position.z ) ;
			}
			
			camera.rotationQuaternion = newRotationQuaternion ;
		}
	}
	
	if ( data.fov !== undefined ) {
		this.fov = data.fov || 90 ;
		// It looks like fov is divided by 2 in Babylon, hence the 360 instead of 180

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'fov' ,
				Babylon.Animation.ANIMATIONTYPE_FLOAT ,
				this.fov * Math.PI / 360
			) ;
		}
		else {
			camera.fov = this.fov * Math.PI / 360 ;
		}
	}

	if ( data.free !== undefined ) { this.free = !! data.free ; }
	if ( data.trackingMode !== undefined ) { this.trackingMode = data.trackingMode || null ; }
	
	// It may be async later, waiting for transitions to finish the camera move?
	return Promise.resolved ;
} ;

