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
const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityGround( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityGround.prototype = Object.create( GEntity.prototype ) ;
GEntityGround.prototype.constructor = GEntityGround ;

module.exports = GEntityGround ;



// Update the gEntity's texture
GEntityGround.prototype.updateTexture = function( texturePackId , variantId , themeId ) {
	var texturePack , variant ;

	if ( texturePackId !== undefined ) { this.texturePack = texturePackId || null ; }
	if ( variantId !== undefined ) { this.variant = variantId || null ; }
	if ( themeId !== undefined ) { this.theme = themeId || null ; }

	console.warn( "3D GEntityGround.updateTexture()" , texturePackId , variantId , themeId ) ;

	texturePack = this.gScene.texturePacks[ this.texturePack + '/' + ( this.theme || this.gScene.theme ) ] ;

	if ( ! texturePack ) {
		console.warn( "3D Texture pack" , this.texturePack + '/' + ( this.theme || this.gScene.theme ) , "not found" ) ;
		texturePack = this.gScene.texturePacks[ this.texturePack + '/default' ] ;

		if ( ! texturePack ) {
			console.warn( "3D Texture pack fallback" , this.texturePack + '/default' , "not found" ) ;
			return Promise.resolved ;
		}
	}

	variant = texturePack.variants[ this.variant ] || texturePack.variants.default ;

	if ( ! variant ) {
		console.warn( "3D Texture pack variant" , this.variant , "not found, and default variant missing too" ) ;
		return Promise.resolved ;
	}

	
	//*
	var url = variant.frames[ 0 ].url ;
	this.babylon.spriteManager = new Babylon.SpriteManager( 'spriteManager' , this.dom.cleanUrl( url ) , 1 , 400 , this.gScene.babylon.scene ) ;
	this.babylon.entity = new Babylon.Sprite( 'sprite' , this.babylon.spriteManager ) ;
	this.babylon.entity.stopAnimation() ; // Not animated
	this.babylon.entity.cellIndex = 0 ;
	this.babylon.entity.position.x = this.position.x ;
	this.babylon.entity.position.y = this.position.y ;
	this.babylon.entity.position.z = this.position.z ;
	this.babylon.entity.width = this.size.x ;
	this.babylon.entity.height = this.size.y ;
	this.babylon.entity.angle = this.rotation.z ;
	//*/
	

	// !!!Interesting properties!!!

	//this.babylon.entity.invertU = -1 ;	// Horizontal flip
	//this.babylon.entity.invertV = -1 ;	// Vertical flip
	//this.babylon.entity.isPickable = true ;	// Click detection
	//this.babylon.entity.useAlphaForPicking = true ;	// Click detection works only on opaque area
} ;



// Size, positioning and rotation
GEntityGround.prototype.updateTransform = function( data ) {
	console.warn( "3D GEntityGround.updateTransform()" , data ) ;
	var entity = this.babylon.entity ,
		scene = this.gScene.babylon.scene ;

	if ( data.position ) {
		this.position = data.position ;

		if ( data.transition ) {
			console.warn( "entity:" , entity ) ;
			// Animation using easing
			
			data.transition.createAnimation(
				scene ,
				entity ,
				'position' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.position.x , this.position.y , this.position.z )
			) ;
		}
		else {
			entity.position.set( this.position.x , this.position.y , this.position.z ) ;
		}
	}

	if ( data.size ) {
		this.size = data.size ;
		entity.width = this.size.x ;
		entity.height = this.size.y ;
	}

	if ( data.rotation ) {
		this.rotation = data.rotation ;
		entity.angle = this.rotation.z ;
	}
} ;

