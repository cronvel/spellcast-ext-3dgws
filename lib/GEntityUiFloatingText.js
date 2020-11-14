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
	//this.fixIconTimer = null ;
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
		if ( this.parent ) { textBlock.linkWithMesh( this.parent.babylon.mesh ) ; }
	}

	this.updateMaterialNeeded = false ;
} ;



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

	if ( content.icon ) {
		// /!\ Use a texture instead of a direct URL? So this could be preloaded?
		if ( this.babylon.icon ) {
			icon = this.babylon.icon ;
			icon.source = this.dom.cleanUrl( content.icon ) ;
			icon.width = 46 ;
			icon.height = 46 ;
		}
		else {
			this.babylon.icon = icon = new Babylon.GUI.Image( 'icon' , this.dom.cleanUrl( content.icon ) ) ;
			icon.widthInPixels = 46 ;
			icon.heightInPixels = 46 ;
			ui.addControl( icon ) ;

			let offset = textBlock._width.isPixel ? - 32 + this.babylon.textBlock.widthInPixels / 2 : - 132 ;

			// SHOULD BE DONE AFTER .addControl()
			if ( this.parent ) {
				icon.linkWithMesh( this.parent.babylon.mesh ) ;
				icon.linkOffsetXInPixels = textBlock.linkOffsetXInPixels + offset ;
			}
			else {
				icon.leftInPixels = textBlock.leftInPixels + offset ;
			}
		}

		//this.fixIcon( this.position ) ;
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
	var textBlock = this.babylon.textBlock ,
		icon = this.babylon.icon ,
		ui = this.gScene.babylon.ui ,
		scene = this.gScene.babylon.scene ;

	var iconX ,
		x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ,
		uiSize = ui.getSize() ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
	}

	x = - x * uiSize.width / 2 ;
	y = - y * uiSize.height / 2 ;

	if ( icon ) {
		if ( textBlock._width.isPixel ) {
			iconX -= 32 + textBlock.widthInPixels / 2 ;
		}
		else {
			iconX -= 132 ;
		}
	}

	if ( this.parent ) {
		if ( data.transition ) {
			data.transition.createAnimation( scene , textBlock , 'linkOffsetXInPixels' , Babylon.Animation.ANIMATIONTYPE_FLOAT , x ) ;
			data.transition.createAnimation( scene , textBlock , 'linkOffsetYInPixels' , Babylon.Animation.ANIMATIONTYPE_FLOAT , y ) ;

			if ( icon ) {
				data.transition.createAnimation( scene , icon , 'linkOffsetXInPixels' , Babylon.Animation.ANIMATIONTYPE_FLOAT , iconX ) ;
				data.transition.createAnimation( scene , icon , 'linkOffsetYInPixels' , Babylon.Animation.ANIMATIONTYPE_FLOAT , y ) ;
			}
		}
		else {
			textBlock.linkOffsetXInPixels = x ;
			textBlock.linkOffsetYInPixels = y ;

			if ( icon ) {
				icon.linkOffsetXInPixels = iconX ;
				icon.linkOffsetYInPixels = y ;
				if ( ! textBlock._width.isPixel ) { this.fixIcon() ; }
			}
		}
	}
	else {
		if ( data.transition ) {
			data.transition.createAnimation( scene , textBlock , 'leftInPixels' , Babylon.Animation.ANIMATIONTYPE_FLOAT , x ) ;
			data.transition.createAnimation( scene , textBlock , 'topInPixels' , Babylon.Animation.ANIMATIONTYPE_FLOAT , y ) ;

			if ( icon ) {
				data.transition.createAnimation( scene , icon , 'leftInPixels' , Babylon.Animation.ANIMATIONTYPE_FLOAT , iconX ) ;
				data.transition.createAnimation( scene , icon , 'topInPixels' , Babylon.Animation.ANIMATIONTYPE_FLOAT , y ) ;
			}
		}
		else {
			textBlock.leftInPixels = x ;
			textBlock.topInPixels = y ;

			if ( icon ) {
				icon.leftInPixels = iconX ;
				icon.topInPixels = y ;
				if ( ! textBlock._width.isPixel ) { this.fixIcon() ; }
			}
		}
	}
} ;



// Internal
GEntityUiFloatingText.prototype.fixIcon = function( position ) {
} ;

