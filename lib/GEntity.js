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
		//this.updateTransform( data ) ;
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

	
	
	var url = variant.frames[ 0 ].url ;
	var spriteManager = new BABYLON.SpriteManager( 'spriteManager' , url , 10 , 400 , this.gScene.babylon.scene ) ;
	var sprite = new BABYLON.Sprite( 'sprite' , spriteManager ) ;
	sprite.position.x = 0 ;
	sprite.position.y = 0 ;
	sprite.position.z = 0 ;
	sprite.cellIndex = 0 ;
	sprite.size = 0.5 ;
} ;



// Load/replace the gEntity's image
GEntity.prototype.updateImage = function( url ) {
	if ( this.usage === 'card' ) {
		this.$image.style.backgroundImage = 'url("' + this.dom.cleanUrl( url ) + '")' ;
		return Promise.resolved ;
	}

	if ( url.endsWith( '.svg' ) ) { return this.updateVgImage( url ) ; }
	
	var promise = new Promise() ,
		shouldAppend = ! this.$image ;

	if ( this.$image && this.$image.tagName.toLowerCase() !== 'img' ) {
		this.$image.remove() ;
		this.$image = null ;
	}

	if ( ! this.$image ) {
		shouldAppend = true ;
		this.$image = document.createElement( 'img' ) ;
		this.$image.classList.add( this.usage ) ;
	}

	this.$image.setAttribute( 'src' , this.dom.cleanUrl( url ) ) ;
	this.$image.onload = () => promise.resolve() ;

	if ( shouldAppend && this.usage !== 'marker' ) {
		this.$wrapper.append( this.$image ) ;
	}

	return promise ;
} ;



// Size, positioning and rotation
GEntity.prototype.updateTransform = function( data ) {
	var areaWidth , areaHeight , imageWidth , imageHeight ;

	if ( data.position ) {
		if ( data.position.x !== undefined ) { this.position.x = data.position.x ; }
		if ( data.position.y !== undefined ) { this.position.y = data.position.y ; }
		if ( data.position.z !== undefined ) { this.position.z = data.position.z ; }
	}

	if ( data.size ) {
		if ( data.size.x !== undefined ) { this.size.x = data.size.x ; }
		if ( data.size.y !== undefined ) { this.size.y = data.size.y ; }
		if ( data.size.z !== undefined ) { this.size.z = data.size.z ; }
	}

	if ( data.rotation ) {
		if ( data.rotation.x !== undefined ) { this.rotation.x = data.rotation.x ; }
		if ( data.rotation.y !== undefined ) { this.rotation.y = data.rotation.y ; }
		if ( data.rotation.z !== undefined ) { this.rotation.z = data.rotation.z ; }
	}

	if ( data.positionMode ) { this.positionMode = data.positionMode || 'default' ; }
	if ( data.sizeMode ) { this.sizeMode = data.sizeMode || 'default' ; }
	if ( data.rotationMode ) { this.rotationMode = data.rotationMode || 'default' ; }

	// For instance, marker are excluded
	if ( ! this.$wrapper || ! this.$image ) { return ; }


	// Pre-compute few thing necessary for the following stuff

	areaWidth = this.gScene.$gscene.offsetWidth ;
	areaHeight = this.gScene.$gscene.offsetHeight ;
	
	if ( this.$image.tagName.toLowerCase() === 'svg' ) {
		// The SVG element is not a DOM HTML element, it does not have offsetWidth/offsetHeight.
		//imageNaturalWidth = this.$image.width.baseVal.value ;
		//imageNaturalHeight = this.$image.height.baseVal.value ;
		imageWidth = this.$wrapper.offsetWidth ;
		imageHeight = this.$wrapper.offsetHeight ;
	}
	else {
		//imageNaturalWidth = this.$image.naturalWidth ;
		//imageNaturalHeight = this.$image.naturalHeight ;
		imageWidth = this.$image.offsetWidth ;
		imageHeight = this.$image.offsetHeight ;
	}
	console.log( "dbg img:" , { areaWidth , areaHeight , imageWidth , imageHeight } ) ;


	// Compute scaling -- should comes first for this to work!
	( sizeModes[ this.sizeMode ] || sizeModes.default )( this._transform , this.size , areaWidth , areaHeight , imageWidth , imageHeight ) ;
	console.log( "._transform after size computing" , this._transform ) ;


	// Compute position
	( positionModes[ this.positionMode ] || positionModes.default )( this._transform , this.position , areaWidth , areaHeight , imageWidth , imageHeight ) ;
	console.log( "._transform after position computing" , this._transform ) ;

	// We use the math convention, x-right, y-up, z-to-cam, z-rotation is counter clockwise, and so on
	this._transform.eulerOrder = this.rotationMode === 'default' ? null : this.rotationMode ;
	this._transform.rotateX = -this.rotation.x ;
	this._transform.rotateY = this.rotation.y ;
	this._transform.rotateZ = -this.rotation.z ;
	console.log( "._transform after rotation computing" , this._transform ) ;

	// Finally, create the transformation CSS string
	domKit.transform( this.$wrapper , this._transform ) ;
} ;

