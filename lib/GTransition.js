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

/* global BABYLON */



const Promise = require( 'seventh' ) ;
const arrayKit = require( 'array-kit' ) ;



/*
	duration: transition duration in s
	easing: the easing function used
*/
// !THIS SHOULD TRACK SERVER-SIDE GTransition! spellcast/lib/gfx/GTransition.js
function GTransition( data ) {
	this.duration = 0.2 ;
	this.easing = 'linear' ;
	this.running = 0 ;
	this.promise = null ;

	if ( data ) { this.update( data ) ; }
}

module.exports = GTransition ;



GTransition.prototype.update = function( data ) {
	if ( ! data || typeof data !== 'object' ) { return ; }

	if ( data.duration !== undefined ) { this.duration = + data.duration || 0 ; }
	if ( data.easing !== undefined ) { this.easing = data.easing || 'linear' ; }

	return this ;
} ;



GTransition.prototype.toString = function( property ) {
	return property + ' ' + this.duration + 's' + ( ' ' + this.easing || '' ) ;
} ;



// All of Babylon built-in easing functions
const EASING_FUNCTION = {
	circle: BABYLON.CircleEase ,
	back: BABYLON.BackEase ,
	bounce: BABYLON.BounceEase ,
	cubic: BABYLON.CubicEase ,
	elastic: BABYLON.ElasticEase ,
	exponential: BABYLON.ExponentialEase ,
	power: BABYLON.PowerEase ,
	quadratic: BABYLON.QuadraticEase ,
	quartic: BABYLON.QuarticEase ,
	quintic: BABYLON.QuinticEase ,
	sine: BABYLON.SineEase ,
	bezier: BABYLON.BezierCurveEase
} ;



GTransition.prototype.createAnimation = function( scene , entity , property , animationType , newValue , oldValue = null ) {
	var easingFunction , animation , animationKeys ,
		animationFps = 30 ,
		frameCount = Math.round( this.duration * animationFps ) ;

	animation = new BABYLON.Animation(
		'transition' ,
		property ,
		animationFps ,
		animationType ,
		BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT ,	// loop mode
		false	// enable blending: no, it produce bad animation (it doesn't end where it should)
	) ;

	if ( oldValue === null ) {
		oldValue = entity[ property ] ;

		if ( oldValue && typeof oldValue === 'object' && oldValue.clone ) {
			// Prevent bug for camera target: https://forum.babylonjs.com/t/best-camera-for-cinematics/13281/3
			oldValue = oldValue.clone() ;
		}
	}

	animationKeys = [
		{ frame: 0 , value: oldValue } ,
		{ frame: frameCount , value: newValue }
	] ;

	animation.setKeys( animationKeys ) ;

	if ( this.easing && EASING_FUNCTION[ this.easing ] ) {
		// For each easing function, you can choose beetween EASEIN (default), EASEOUT, EASEINOUT
		easingFunction = new EASING_FUNCTION[ this.easing ]() ;
		easingFunction.setEasingMode( BABYLON.EasingFunction.EASINGMODE_EASEINOUT ) ;
		animation.setEasingFunction( easingFunction ) ;
	}

	// Adding animation to the animations collection
	entity.animations.push( animation ) ;

	if ( ! this.promise ) {
		this.promise = new Promise() ;
		// Prevent from bug or side-effect where the animation event would be lost? (e.g. animation aborted?)
		// The promise is resolved in the "onAnimationEnd" callback, this one is a fallback.
		this.promise.resolveTimeout( 1000 * this.duration + 20 ) ;
	}

	// Finally, launch animation, from key 0 to last-key
	this.running ++ ;
	scene.beginAnimation(
		entity ,
		0 ,	// starting frame
		frameCount ,	// ending frame
		false ,	// loop
		1 ,	// speed ratio
		() => {
			// onAnimationEnd callback
			this.running -- ;
			scene.removeAnimation( animation ) ;
			arrayKit.deleteValue( entity.animations , animation ) ;
			if ( this.running <= 0 ) { this.promise.resolve() ; }
		} ,
		undefined ,
		false	// stop current running animations?
	) ;
} ;

const INTERPOLATE = [] ;
// Re-use Babylon interpolation
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_COLOR3 ] = BABYLON.Animation.prototype.color3InterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_COLOR4 ] = BABYLON.Animation.prototype.color4InterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_FLOAT ] = ( start , end , gradient ) => start + gradient * ( end - start ) ;
//INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_FLOAT ] = BABYLON.Animation.prototype.floatInterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_MATRIX ] = BABYLON.Animation.prototype.matrixInterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_QUATERNION ] = BABYLON.Animation.prototype.quaternionInterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_SIZE ] = BABYLON.Animation.prototype.sizeInterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_VECTOR2 ] = BABYLON.Animation.prototype.vector2InterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ] = BABYLON.Animation.prototype.vector3InterpolateFunction ;

// This is used when .createAnimation() won't work because the property is not animatable in Babylon.
// It returns a unique function to be used inside the render loop, which return true when its jobs is done and can be deleted.
GTransition.prototype.createAnimationFn = function( gScene , entity , property , animationType , newValue , oldValue = null ) {
	//if ( animationType !== BABYLON.Animation.ANIMATIONTYPE_FLOAT ) { throw new Error( ".createAnimationFn(): Only ANIMATIONTYPE_FLOAT is supported ATM" ) ; }

	if ( oldValue === null ) {
		oldValue = entity[ property ] ;
		if ( oldValue && typeof oldValue === 'object' && oldValue.clone ) { oldValue = oldValue.clone() ; }
	}

	var startTime = Date.now() / 1000 ;

	if ( ! this.promise ) {
		this.promise = new Promise() ;
		// Prevent from bug or side-effect where the animation event would be lost? (e.g. animation aborted?)
		this.promise.resolveTimeout( 1000 * this.duration + 20 ) ;
	}

	this.running ++ ;

	var fn = ( t ) => {
		var rt ,
			dt = t - startTime ;

		// Whatever happen, rt should not "leak" outside its duration
		if ( dt >= this.duration ) {
			rt = 1 ;
			this.running -- ;
			gScene.animationFunctions.delete( fn ) ;
			if ( this.running <= 0 ) { this.promise.resolve() ; }
		}
		else {
			rt = dt / this.duration ;
		}

		//entity[ property ] = oldValue + rt * ( newValue - oldValue ) ;
		entity[ property ] = INTERPOLATE[ animationType ]( oldValue , newValue , rt ) ;
	} ;

	// Add it to the gScene
	gScene.animationFunctions.add( fn ) ;

	return fn ;
} ;

