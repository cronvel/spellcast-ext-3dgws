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

const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
function GEntity( dom , gScene , data ) {
	this.dom = dom ;	// Dom instance, immutable
	this.gScene = gScene ;
	this.usage = data.usage || 'sprite' ;	// immutable

	this.show = false ;
	this.persistent = true ;
	this.button = null ;
	this.theme = null ;
	this.texturePack = null ;
	this.variant = 'default' ;
	this.location = null ;
	this.position = { x: 0 , y: 0 , z: 0 } ;
	this.positionMode = 'default' ;
	this.size = { x: 1 , y: 1 , z: 1 } ;
	this.sizeMode = 'default' ;
	this.rotation = { x: 0 , y: 0 , z: 0 } ;
	this.rotationMode = 'default' ;
	//this.rotation = TO BE DEFINED....

	this.data = {} ;
	this.meta = {} ;
	this.engine = {} ;

	this.transitions = {
		transform: null ,	// change in position, size, rotation, 3D transform/matrix and more...
		//position: null , size: null , rotation: null ,
		opacity: null ,
		color: null ,
		effect: null
	} ;


	// Internal
	this.babylon = {
		entity: null
	} ;

	this.defineStates( 'loaded' , 'loading' ) ;
}

GEntity.prototype = Object.create( Ngev.prototype ) ;
GEntity.prototype.constructor = GEntity ;

module.exports = GEntity ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
GEntity.prototype.update = async function( data , initial = false ) {
	console.warn( "3D GEntity.update()" , data ) ;

	// Structural/discrete part

	if ( data.texturePack !== undefined || data.variant !== undefined || data.theme !== undefined ) {
		await this.updateTexture( data.texturePack , data.variant , data.theme ) ;
	}

	//if ( data.button !== undefined ) { this.updateButton( data.button ) ; }


	// Continuous part

	//if ( data.transitions !== undefined ) { this.updateTransition( data.transitions ) ; }

	if (
		data.position !== undefined || data.positionMode !== undefined
		|| data.size !== undefined || data.sizeMode !== undefined
		|| data.rotation !== undefined || data.rotationMode !== undefined
	) {
		this.updateTransform( data ) ;
	}

	//if ( data.meta ) { this.updateMeta( data.meta ) ; }
} ;



// Update the gEntity's texture
GEntity.prototype.updateTexture = function( texturePackId , variantId , themeId ) {
	var texturePack , variant ;

	if ( texturePackId !== undefined ) { this.texturePack = texturePackId || null ; }
	if ( variantId !== undefined ) { this.variant = variantId || null ; }
	if ( themeId !== undefined ) { this.theme = themeId || null ; }

	console.warn( "3D GEntity.updateTexture()" , texturePackId , variantId , themeId ) ;

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
	this.babylon.entity.stopAnimation(); // Not animated
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
GEntity.prototype.updateTransform = function( data ) {
	var animation = new Babylon.Animation( 'transition' , 'position' , 30 , Babylon.Animation.ANIMATIONTYPE_VECTOR3 , Babylon.Animation.ANIMATIONLOOPMODE_CYCLE ) ;

	if ( data.position ) {
		if ( data.position.x !== undefined ) { this.babylon.entity.position.x = this.position.x = data.position.x ; }
		if ( data.position.y !== undefined ) { this.babylon.entity.position.y = this.position.y = data.position.y ; }
		if ( data.position.z !== undefined ) { this.babylon.entity.position.z = this.position.z = data.position.z ; }
	}

	if ( data.size ) {
		if ( data.size.x !== undefined ) { this.babylon.entity.width = this.size.x = data.size.x ; }
		if ( data.size.y !== undefined ) { this.babylon.entity.height = this.size.y = data.size.y ; }
		if ( data.size.z !== undefined ) { this.size.z = data.size.z ; }
	}

	if ( data.rotation ) {
		if ( data.rotation.x !== undefined ) { this.rotation.x = data.rotation.x ; }
		if ( data.rotation.y !== undefined ) { this.rotation.y = data.rotation.y ; }
		if ( data.rotation.z !== undefined ) { this.babylon.entity.angle = this.rotation.z = data.rotation.z ; }
	}
} ;

