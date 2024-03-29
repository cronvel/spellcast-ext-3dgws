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



const engine = {} ;
module.exports = engine ;

engine.GScene = require( './GScene.js' ) ;
engine.Camera = require( './Camera.js' ) ;
engine.GEntity = require( './GEntity.js' ) ;
engine.perUsageGEntity = {
	hemisphericLight: require( './GEntityHemisphericLight.js' ) ,
	directionalLight: require( './GEntityDirectionalLight.js' ) ,
	pointLight: require( './GEntityPointLight.js' ) ,
	spotLight: require( './GEntitySpotLight.js' ) ,
	background: require( './GEntityBackground.js' ) ,
	sprite: require( './GEntitySprite.js' ) ,
	shadow: require( './GEntityShadow.js' ) ,
	fx: require( './GEntityFx.js' ) ,
	particleSystem: require( './GEntityParticleSystem.js' ) ,
	floatingText: require( './GEntityFloatingText.js' ) ,
	uiFloatingText: require( './GEntityUiFloatingText.js' ) ,
	basicShape: require( './GEntityBasicShape.js' ) ,
	ground: require( './GEntityGround.js' ) ,
	vg: require( './GEntityVg.js' ) ,
	card: require( './GEntityCard.js' )
} ;

engine.DiceRoller = require( './DiceRoller.js' ) ;

