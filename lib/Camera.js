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

//const domKit = require( 'dom-kit' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE Camera! spellcast/lib/gfx/Camera.js
function Camera( gScene , data ) {
	this.gScene = gScene ;    // immutable

	this.up = { x: 0 , y: 1 , z: 0 } ;
	this.position = { x: 0 , y: 0 , z: 10 } ;
	this.targetPosition = { x: 0 , y: 0 , z: 0 } ;
	this.free = false ;
	this.trackingMode = null ;
	this.perspective = 1 ;
	this.fov = 90 ;

	// Babylon stuffs
	this.babylon = {
		camera: null
	} ;
	
	this.babylon.camera = new Babylon.FreeCamera(
		'Camera' ,
		new Babylon.Vector3( this.position.x , this.position.y , this.position.z ) ,
		this.gScene.babylon.scene
	) ;
	
	this.babylon.camera.setTarget( new Babylon.Vector3( this.targetPosition.x , this.targetPosition.y , this.targetPosition.z ) ) ;

	// Make the canvas events control the camera
	//this.babylon.camera.attachControl( this.gScene.$gscene , true ) ;

	// Make the mouse wheel move less
	//this.babylon.camera.wheelPrecision = 20 ;
}

module.exports = Camera ;



// !THIS SHOULD TRACK SERVER-SIDE Camera! spellcast/lib/gfx/Camera.js
Camera.prototype.update = function( data ) {
    console.warn( "3D Camera.update()" , data ) ;
	var oldValue ,
		camera = this.babylon.camera ,
		scene = this.gScene.babylon.scene ;

	if ( data.transition ) { data.transition = new GTransition( data.transition ) ; }

	if ( data.up ) {
		this.up = data.up ;
		
		console.warn( "camera:" , camera ) ;
		if ( data.transition ) {
			// Animation using easing
			data.transition.createAnimation(
				scene ,
				camera ,
				'upVector' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.up.x , this.up.y , this.up.z )
			) ;
		}
		else {
			camera.upVector = new Babylon.Vector3( this.up.x , this.up.y , this.up.z ) ;
		}
	}

	if ( data.position ) {
		this.position = data.position ;
		
		console.warn( "camera:" , camera ) ;
		if ( data.transition ) {
			// Animation using easing
			data.transition.createAnimation(
				scene ,
				camera ,
				'position' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.position.x , this.position.y , this.position.z )
			) ;
		}
		else {
			camera.position = new Babylon.Vector3( this.position.x , this.position.y , this.position.z ) ;
		}
	}

	if ( data.targetPosition ) {
		// Here we need to use the original target position, because when camera.position is changed,
		// camera.target is translated
		oldValue = this.targetPosition ;
		this.targetPosition = data.targetPosition ;
		
		console.warn( "camera:" , camera ) ;
		if ( data.transition ) {
			// Animation using easing
			data.transition.createAnimation(
				scene ,
				camera ,
				'target' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.targetPosition.x , this.targetPosition.y , this.targetPosition.z ) ,
				new Babylon.Vector3( oldValue.x , oldValue.y , oldValue.z )
			) ;
		}
		else {
			camera.target = new Babylon.Vector3( this.targetPosition.x , this.targetPosition.y , this.targetPosition.z ) ;
		}
	}

	if ( data.free !== undefined ) { this.free = !! data.free ; }
	if ( data.trackingMode !== undefined ) { this.trackingMode = data.trackingMode || null ; }
	
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

	// It may be async later, waiting for transitions to finish the camera move?
	return Promise.resolved ;
} ;

