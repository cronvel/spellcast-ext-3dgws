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
function Camera( gScene ) {
	this.gScene = gScene ;    // immutable

	this.mode = null ;
	this.position = { x: 0 , y: 0 , z: 10 } ;
	this.target = { x: 0 , y: 0 , z: 0 } ;
	this.rotation = {
		x: 0 , y: 0 , z: 0 , w: 1
	} ;
	this.yaw = 0 ;
	this.pitch = 0 ;
	this.roll = 0 ;
	this.distance = 10 ;
	this.fov = 90 ;
	this.perspective = 1 ;
	this.free = false ;
	this.trackingMode = null ;

	// Babylon stuffs
	this.babylon = {
		type: null ,
		camera: null
	} ;

	// This create and attach actual camera
	this.setMode( 'firstPerson' ) ;
}

module.exports = Camera ;



// !THIS SHOULD TRACK SERVER-SIDE Camera! spellcast/lib/gfx/Camera.js
Camera.prototype.update = function( data , awaiting = false ) {
	console.warn( "3D Camera.update()" , data ) ;
	var camera = this.babylon.camera ,
		scene = this.gScene.babylon.scene ;

	if ( data.mode ) {
		this.setMode( data.mode ) ;
	}

	if ( data.transition ) {
		data.transition = new GTransition( data.transition ) ;
	}

	switch ( this.mode ) {
		case 'positions' :
			if ( data.position || data.target || data.roll !== undefined ) {
				this.updatePositions( data ) ;
			}
			break ;
		case 'orbital' :
			if ( data.target || data.yaw !== undefined || data.pitch !== undefined || data.roll !== undefined || data.distance !== undefined ) {
				this.updateOrbital( data ) ;
			}
			break ;
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

	return ( awaiting && data.transition && data.transition.promise ) || Promise.resolved ;
} ;



Camera.prototype.setMode = function( mode ) {
	var alpha , beta ;

	console.warn( "##### Camera.setMode()" , mode , this.mode ) ;
	if ( mode === this.mode ) { return ; }
	this.mode = mode ;

	switch ( this.mode ) {
		case 'positions' :
		case 'firstPerson' :
		case 'firstPersonQuaternion' :
			if ( this.babylon.type === 'FreeCamera' ) {
				this.babylon.camera.position = new Babylon.Vector3( this.position.x , this.position.y , this.position.z ) ;
			}
			else {
				this.babylon.type = 'FreeCamera' ;

				if ( this.babylon.camera ) { this.babylon.camera.dispose() ; }

				this.babylon.camera = new Babylon.FreeCamera(
					'Camera' ,
					new Babylon.Vector3( this.position.x , this.position.y , this.position.z ) ,
					this.gScene.babylon.scene
				) ;

				// TMP: Make the canvas events control the camera
				this.babylon.camera.attachControl( this.gScene.$gscene , true ) ;
			}
			
			if ( this.mode === 'positions' ) {
				this.babylon.camera.rotationQuaternion = Babylon.Quaternion.FromEulerVector(
					vectorUtils.cameraRotationFromOriginAndTarget( this.position , this.target , this.roll * vectorUtils.DEG_TO_RAD )
				) ;
			}
			else if ( this.mode === 'firstPersonQuaternion' ) {
				this.babylon.camera.rotationQuaternion = new Babylon.Quaternion(
					this.rotation.x ,
					this.rotation.y ,
					this.rotation.z ,
					this.rotation.w
				) ;
			}
			else {
				this.babylon.camera.rotationQuaternion = Babylon.Quaternion.FromEulerAngles(
					this.pitch ,
					this.yaw ,
					this.roll
				) ;
			}

			break ;

		case 'orbital' :
			alpha = vectorUtils.toCameraAlpha( this.yaw ) ;
			beta = vectorUtils.toCameraBeta( this.pitch ) ;

			if ( this.babylon.type === 'ArcRotateCamera' ) {
				this.babylon.camera.target = new Babylon.Vector3( this.target.x , this.target.y , this.target.z ) ;
				this.babylon.camera.alpha = alpha ;
				this.babylon.camera.beta = beta ;
				this.babylon.camera.radius = this.distance ;
			}
			else {
				this.babylon.type = 'ArcRotateCamera' ;

				if ( this.babylon.camera ) { this.babylon.camera.dispose() ; }

				this.babylon.camera = new Babylon.ArcRotateCamera(
					'Camera' ,
					alpha ,
					beta ,
					this.distance ,
					new Babylon.Vector3( this.target.x , this.target.y , this.target.z ) ,
					this.gScene.babylon.scene
				) ;

				// TMP: Make the canvas events control the camera
				this.babylon.camera.attachControl( this.gScene.$gscene , true ) ;
			}

			break ;
		
		// Not supported ATM
		//case 'orbitalQuaternion' :

		default :
			return ;
	}

	// Make the mouse wheel move less
	//this.babylon.camera.wheelPrecision = 20 ;

	console.warn( "~~~~~~ Camera.setMode() done" ) ;
} ;



Camera.prototype.updatePositions = function( data ) {
	var camera = this.babylon.camera ,
		scene = this.gScene.babylon.scene ;

	if ( data.position ) { this.position = data.position ; }
	if ( data.target ) { this.target = data.target ; }
	if ( data.roll !== undefined ) { this.roll = data.roll ; }

	// I found out that rotation can't be animated properly without quaternion,
	// so even if the new value is computed in Euler YXZ, it is translated into quaternion for the animation.
	var newRotation = vectorUtils.cameraRotationFromOriginAndTarget( this.position , this.target , this.roll * vectorUtils.DEG_TO_RAD ) ;
	var newRotationQuaternion = Babylon.Quaternion.FromEulerVector( newRotation ) ;

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
} ;



Camera.prototype.updateOrbital = function( data ) {
	var alpha , beta ,
		camera = this.babylon.camera ,
		scene = this.gScene.babylon.scene ;

	if ( data.target ) { this.target = data.target ; }
	
	if ( data.yaw ) {
		this.yaw = data.yaw ;
		alpha = vectorUtils.toCameraAlpha( this.yaw ) ;
	}
	
	if ( data.pitch ) {
		this.pitch = data.pitch ;
		beta = vectorUtils.toCameraBeta( this.pitch ) ;
	}
	
	if ( data.distance ) { this.distance = data.distance ; }

	if ( data.transition ) {
		console.warn( "[!] camera transition:" , camera ) ;

		if ( data.target ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'target' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.target.x , this.target.y , this.target.z )
			) ;
		}

		if ( data.yaw ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'alpha' ,
				Babylon.Animation.ANIMATIONTYPE_FLOAT ,
				alpha
			) ;
		}

		if ( data.pitch ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'beta' ,
				Babylon.Animation.ANIMATIONTYPE_FLOAT ,
				beta
			) ;
		}

		if ( data.distance ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'radius' ,
				Babylon.Animation.ANIMATIONTYPE_FLOAT ,
				this.distance
			) ;
		}
	}
	else {
		console.warn( "[!] camera direct:" , camera ) ;
		if ( data.target ) { camera.target = new Babylon.Vector3( this.target.x , this.target.y , this.target.z ) ; }
		if ( data.yaw ) { camera.alpha = alpha ; }
		if ( data.pitch ) { camera.beta = beta ; }
		if ( data.distance ) { camera.radius = this.distance ; }
	}
} ;

