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
const arrayKit = require( 'array-kit' ) ;



/*
	duration: transition duration in s
	easing: the easing function used
*/
// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GTransition.js
function GTransition( data ) {
	this.duration = 0.2 ;
	this.easing = 'linear' ;

	if ( data ) { this.update( data ) ; }
}

module.exports = GTransition ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GTransition.js
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
	circle: Babylon.CircleEase ,
	back: Babylon.BackEase ,
	bounce: Babylon.BounceEase ,
	cubic: Babylon.CubicEase ,
	elastic: Babylon.ElasticEase ,
	exponential: Babylon.ExponentialEase ,
	power: Babylon.PowerEase ,
	quadratic: Babylon.QuadraticEase ,
	quartic: Babylon.QuarticEase ,
	quintic: Babylon.QuinticEase ,
	sine: Babylon.SineEase ,
	bezier: Babylon.BezierCurveEase
} ;



GTransition.prototype.createAnimation = function( scene , entity , property , animationType , newValue ) {
	var easingFunction , animationFps = 30 ,
		frameCount = Math.round( this.duration * animationFps ) ,
		animation = new Babylon.Animation( 'transition' , property , animationFps , animationType , Babylon.Animation.ANIMATIONLOOPMODE_CONSTANT ) ,
		animationKeys = [
			{ frame: 0 , value: entity[ property ] } ,
			{ frame: frameCount , value: newValue }
		] ;

	animation.setKeys( animationKeys ) ;

	if ( this.easing && EASING_FUNCTION[ this.easing ] ) {
		// For each easing function, you can choose beetween EASEIN (default), EASEOUT, EASEINOUT
		easingFunction = new EASING_FUNCTION[ this.easing ]() ;
		easingFunction.setEasingMode( Babylon.EasingFunction.EASINGMODE_EASEINOUT ) ;
		animation.setEasingFunction( easingFunction ) ;
	}
	
	// Adding animation to the animations collection
	entity.animations.push( animation ) ;
	
	// Finally, launch animation, from key 0 to last-key, last argument is for activating loop (we don't want it)
	scene.beginAnimation(
		entity ,
		0 ,	// starting frame
		frameCount ,	// ending frame
		false ,	// loop
		1 ,	// speed ratio
		() => {
			// onAnimationEnd callback
			scene.removeAnimation( animation ) ;
			arrayKit.deleteValue( entity.animations , animation ) ;
		} ,
		undefined ,
		false	// stop current running animations?
	) ;
} ;

