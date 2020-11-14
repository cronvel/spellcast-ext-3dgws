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
Babylon.GUI = require( 'babylonjs-gui' ) ;
const GEntity = require( './GEntity.js' ) ;
const GEntityFloatingText = require( './GEntityFloatingText.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityUiFloatingText( dom , gScene , data ) {
	GEntityFloatingText.call( this , dom , gScene , data ) ;
}

GEntityUiFloatingText.prototype = Object.create( GEntityFloatingText.prototype ) ;
GEntityUiFloatingText.prototype.constructor = GEntityUiFloatingText ;

module.exports = GEntityUiFloatingText ;



GEntityUiFloatingText.prototype.destroy = function() {
	if ( this.babylon.textBlock ) { this.babylon.textBlock.dispose() ; }
	if ( this.babylon.icon ) { this.babylon.icon.dispose() ; }

	GEntity.prototype.destroy.call( this ) ;
} ;



// Update the gEntity's material/texture
GEntityUiFloatingText.prototype.updateMaterial = function() {
	var ui , textBlock , icon ,
		scene = this.gScene.babylon.scene ;

	console.warn( "3D GEntityUiFloatingText.updateMaterial()" ) ;

	if ( this.gScene.babylon.ui ) {
		ui = this.gScene.babylon.ui ;
	}
	else {
		this.gScene.babylon.ui = ui = Babylon.GUI.AdvancedDynamicTexture.CreateFullscreenUI( 'ui' ) ;
	}

	if ( this.babylon.textBlock ) {
		textBlock = this.babylon.textBlock ;
	}
	else {
		this.babylon.textBlock = textBlock = new Babylon.GUI.TextBlock() ;
		// Font size should be at most 3/4 of the texture height, but with shadow, it should be even less...
		textBlock.fontSizeInPixels = 46 ;
		//textBlock.text = "test Hq Ap|█" ;
		textBlock.text = this.special.content.text ;
		textBlock.color = this.special.content.textColor ;
		textBlock.alpha = this.opacity ;
		textBlock.resizeToFit = true ;
		ui.addControl( textBlock ) ;

		// SHOULD BE DONE AFTER .addControl()
		textBlock.linkWithMesh( this.parent.babylon.mesh ) ;
	}

	this.updateMaterialNeeded = false ;
} ;



// Because font does not use 100% of height all the time...
const ICON_HEIGHT_RATIO = 0.7 ;

GEntityUiFloatingText.prototype.updateContent = function( content ) {
	var icon ,
		ui = this.gScene.babylon.ui ,
		textBlock = this.babylon.textBlock ;

	if ( ! textBlock ) { return ; }

	if ( content.text !== undefined ) { textBlock.text = this.special.content.text = '' + content.text ; }
	if ( typeof content.textColor === 'string' ) { textBlock.color = this.special.content.textColor = content.textColor ; }
	if ( typeof content.outlineColor === 'string' ) { textBlock.outlineColor = this.special.content.outlineColor = content.outlineColor ; }
	if ( typeof content.outlineWidth === 'number' ) { textBlock.outlineWidth = this.special.content.outlineWidth = content.outlineWidth ; }
	if ( typeof content.shadowColor === 'string' ) { textBlock.shadowColor = this.special.content.shadowColor = content.shadowColor ; }
	if ( typeof content.shadowBlur === 'number' ) { textBlock.shadowBlur = this.special.content.shadowBlur = content.shadowBlur ; }

	/*
	if ( content.icon ) {
		// /!\ Use a texture instead of a direct URL? So this could be preloaded?
		if ( this.babylon.icon ) {
			icon = this.babylon.icon ;
			icon.source = this.dom.cleanUrl( content.icon ) ;
			icon.width = ICON_HEIGHT_RATIO * 0.0625 ;
			icon.height = ICON_HEIGHT_RATIO ;
		}
		else {
			this.babylon.icon = icon = new Babylon.GUI.Image( 'icon' , this.dom.cleanUrl( content.icon ) ) ;
			icon.width = ICON_HEIGHT_RATIO * 0.0625 ;
			icon.height = ICON_HEIGHT_RATIO ;
			ui.addControl( icon ) ;
		}

		this.iconPosition() ;
	}
	*/
} ;



// Internal
GEntityUiFloatingText.prototype.iconPosition = function() {
	// The width of the TextBlock is not correctly synchronously detected,
	// we have to wait a bit for the correct width to be computed.
	if ( this.babylon.textBlock._width.isPixel ) {
		this.babylon.icon.left = - 32 - this.babylon.textBlock.widthInPixels / 2 ;
	}
	else {
		setTimeout( () => this.iconPosition() , 10 ) ;
	}
} ;



GEntityUiFloatingText.prototype.updateMesh = function() {
	this.updateMeshNeeded = false ;
	return ;
} ;



GEntityUiFloatingText.prototype.updateSpecialStage2 = function( data ) {
	if ( data.special && data.special.content ) {
		this.updateContent( data.special.content ) ;
	}
} ;



GEntityUiFloatingText.prototype.updatePosition = function( data , volatile = false ) {
	// If there is a parent, we have to use the special
	//console.warn( "3D GEntity.updatePosition()" , data ) ;
	var textBlock = this.babylon.textBlock ,
		scene = this.gScene.babylon.scene ;

	var x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
	}

	if ( this.parent ) {
		if ( data.transition ) {
			//console.warn( "textBlock:" , textBlock ) ;
			// Animation using easing

			data.transition.createAnimation(
				scene ,
				textBlock ,
				'linkOffsetX' ,
				Babylon.Animation.ANIMATIONTYPE_FLOAT ,
				x
			) ;

			data.transition.createAnimation(
				scene ,
				textBlock ,
				'linkOffsetY' ,
				Babylon.Animation.ANIMATIONTYPE_FLOAT ,
				y
			) ;
		}
		else {
			textBlock.linkOffsetX = - 100 * x ;
			textBlock.linkOffsetY = - 100 * y ;
		}
	}
	else {
		if ( data.transition ) {
			//console.warn( "textBlock:" , textBlock ) ;
			// Animation using easing

			data.transition.createAnimation(
				scene ,
				textBlock ,
				'position' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( x , y , z )
			) ;
		}
		else {
			textBlock.position.set( x , y , z ) ;
		}
	}
} ;

