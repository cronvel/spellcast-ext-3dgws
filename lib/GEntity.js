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
const Parametric = require( './Parametric.js' ) ;

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
	this.origin = { x: 0 , y: 0 , z: 0 } ;
	this.position = { x: 0 , y: 0 , z: 0 } ;
	this.positionMode = 'default' ;
	this.size = { x: 1 , y: 1 , z: 1 } ;
	this.sizeMode = 'default' ;
	this.rotation = { x: 0 , y: 0 , z: 0 } ;
	this.rotationMode = 'default' ;
	this.direction = { x: 1 , y: 0 , z: 0 } ;
	this.facing = 0 ;

	this.special = {} ;
	this.meta = {} ;
	this.engine = {} ;
	this.parametric = null ;

	this.clientMods = {		// Things that are not server-side
		variant: null ,		// A variant affix that is automatically computed
		xFlipVariant: null ,	// A variant that can be used flipped
		xFlip: false
	} ;

	// Internal
	this.updateMeshNeeded = true ;
	this.createLightNeeded = false ;
	this.lightEmitting = false ;
	this.babylon = {
		material: null ,
		mesh: null ,
		light: null		// Attached light, if any
	} ;

	this.defineStates( 'loaded' , 'loading' ) ;
}

GEntity.prototype = Object.create( Ngev.prototype ) ;
GEntity.prototype.constructor = GEntity ;

module.exports = GEntity ;



GEntity.prototype.localBBoxSize = 1 ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
GEntity.prototype.update = async function( data , awaiting = false , initial = false ) {
	console.warn( "3D GEntity.update()" , data ) ;

	if ( data.transition ) {
		if ( initial ) { delete data.transition ; }
		else { data.transition = new GTransition( data.transition ) ; }
	}

	// Structural/discrete part

	if ( data.engine !== undefined ) { await this.updateEngine( data.engine ) ; }

	// /!\ This createLightNeeded thing is not coded very well, need refacto... /!\
	if ( this.createLightNeeded ) {
		this.createLightNeeded = false ;
		this.lightEmitting = true ;
		await this.createLight() ;
	}

	if ( data.special !== undefined ) { await this.updateSpecial( data ) ; }

	if ( data.texturePack !== undefined || data.variant !== undefined || data.theme !== undefined ) {
		await this.updateTexture( data.texturePack , data.variant , data.theme ) ;
	}

	if ( this.updateMeshNeeded ) { await this.updateMesh() ; }
	//if ( data.button !== undefined ) { this.updateButton( data.button ) ; }

	// Continuous part

	if ( data.origin !== undefined ) { this.updateOrigin( data.origin ) ; }

	if ( data.direction !== undefined ) { this.updateDirection( data.direction ) ; }
	if ( data.facing !== undefined ) { this.updateFacing( data.facing ) ; }

	if ( data.position !== undefined || data.positionMode !== undefined ) {
		this.updatePosition( data ) ;
		if ( this.lightEmitting ) { this.updateLightPosition( data ) ; }
	}

	if ( data.rotation !== undefined || data.rotationMode !== undefined ) { this.updateRotation( data ) ; }
	if ( data.size !== undefined || data.sizeMode !== undefined ) { this.updateSize( data ) ; }

	//if ( data.meta ) { this.updateMeta( data.meta ) ; }

	if ( data.parametric !== undefined ) {
		if ( ! data.parametric ) {
			if ( this.parametric ) {
				this.parametric = null ;
				this.gScene.parametricGEntities.delete( this ) ;
			}
		}
		else if ( typeof data.parametric === 'object' ) {
			if ( ! this.parametric ) {
				this.gScene.parametricGEntities.add( this ) ;
				this.parametricCtx = {
					t: 0 ,
					tOffset: - Date.now() / 1000
				} ;
				this.parametricComputedData = {} ;
			}
			
			this.parametric = new Parametric( data.parametric ) ;
		}
		console.warn( "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ 3D GEntity.update() parametric" , data ) ;
	}

	return ( awaiting && data.transition && data.transition.promise ) || Promise.resolved ;
} ;



GEntity.prototype.parametricUpdate = function( absoluteT ) {
	var data = this.parametric.compute( absoluteT , this ) ;

	if ( data.position !== undefined || data.positionMode !== undefined ) {
		this.updatePosition( data , true ) ;
		if ( this.lightEmitting ) { this.updateLightPosition( data , true ) ; }
	}

	if ( data.rotation !== undefined || data.rotationMode !== undefined ) { this.updateRotation( data , true ) ; }
	if ( data.size !== undefined || data.sizeMode !== undefined ) { this.updateSize( data , true ) ; }
} ;



GEntity.prototype.updateEngine = function( engineData ) {} ;



GEntity.prototype.updateSpecial = function( data ) {
	if ( data.special.light !== undefined ) {
		this.updateLight( data ) ;
	}
} ;



// By default, changing the facing direction does nothing
GEntity.prototype.updateDirection = function( direction ) { this.direction = direction ; } ;
GEntity.prototype.updateFacing = function( facing ) { this.facing = facing ; } ;
GEntity.prototype.updateMesh = function() {} ;



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
			return ;
		}
	}


	this.clientMods.xFlip = false ;

	if ( this.clientMods.variant ) {
		variant = texturePack.variants[ this.variant + '@' + this.clientMods.variant ] ;
		if ( ! variant ) {
			variant = texturePack.variants[ this.variant + '@' + this.clientMods.xFlipVariant ] ;
			
			if ( variant ) {
				this.clientMods.xFlip = true ;
			}
			else {
				variant = texturePack.variants[ this.variant ] || texturePack.variants.default ;
			}
		}
	}
	else {
		variant = texturePack.variants[ this.variant ] || texturePack.variants.default ;
	}

	//console.warn( "@@@@@@@@@@ variant" , this.clientMods.variant ? this.variant + '@' + this.clientMods.variant : this.variant ) ;

	if ( ! variant ) {
		console.warn( "3D Texture pack variant" , this.variant , "not found, and default variant missing too" ) ;
		return ;
	}

	return this.updateTexture_( texturePack , variant ) ;
} ;



GEntity.prototype.updateOrigin = function( newOrigin ) {
	var mesh = this.babylon.mesh ,
		rate = this.localBBoxSize / 2 ;

	// For each axis, 0 is middle of BBox, -1 is lower bound, +1 is upper bound
	mesh.bakeTransformIntoVertices( Babylon.Matrix.Translation(
		( this.origin.x - newOrigin.x ) * rate ,
		( this.origin.y - newOrigin.y ) * rate ,
		( this.origin.z - newOrigin.z ) * rate
	) ) ;

	this.origin = newOrigin ;
} ;



GEntity.prototype.updatePosition = function( data , volatile = false ) {
	console.warn( "3D GEntity.updatePosition()" , data ) ;
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( ! mesh ) { return ; }

	var x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ,
		z = data.position.z !== undefined ? data.position.z : this.position.z ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
		this.position.z = z ;
	}

	if ( data.transition ) {
		console.warn( "mesh:" , mesh ) ;
		// Animation using easing

		data.transition.createAnimation(
			scene ,
			mesh ,
			'position' ,
			Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
			new Babylon.Vector3( x , y , z )
		) ;
	}
	else {
		mesh.position.set( x , y , z ) ;
	}
} ;



GEntity.prototype.updateRotation = function( data , volatile = false ) {
	console.warn( "3D GEntity.updateRotation()" , data ) ;
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( ! mesh ) { return ; }

	var x = data.rotation.x !== undefined ? data.rotation.x : this.rotation.x ,
		y = data.rotation.y !== undefined ? data.rotation.y : this.rotation.y ,
		z = data.rotation.z !== undefined ? data.rotation.z : this.rotation.z ;

	if ( ! volatile ) {
		this.rotation.x = x ;
		this.rotation.y = y ;
		this.rotation.z = z ;
	}

	mesh.angle = z ;
} ;



GEntity.prototype.updateSize = function( data , volatile = false ) {
	console.warn( "3D GEntity.updateSize()" , data ) ;
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( ! mesh ) { return ; }

	var x = data.size.x !== undefined ? data.size.x : this.size.x ,
		y = data.size.y !== undefined ? data.size.y : this.size.y ,
		z = data.size.z !== undefined ? data.size.z : this.size.z ;

	if ( ! volatile ) {
		this.size.x = x ;
		this.size.y = y ;
		this.size.z = z ;
	}

	//mesh.width = this.size.x ;
	//mesh.height = this.size.y ;
	mesh.scaling.x = x ;
	mesh.scaling.y = y ;
	mesh.scaling.z = z ;
} ;



GEntity.prototype.updateLightPosition = function( data , volatile = false ) {
	console.warn( "3D GEntity.updateLightPosition()" , data ) ;
	var light = this.babylon.light ,
		scene = this.gScene.babylon.scene ;

	if ( ! light ) { return ; }

	var x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ,
		z = data.position.z !== undefined ? data.position.z : this.position.z ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
		this.position.z = z ;
	}

	if ( data.transition ) {
		console.warn( "light:" , light ) ;
		// Animation using easing

		data.transition.createAnimation(
			scene ,
			light ,
			'position' ,
			Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
			new Babylon.Vector3( this.position.x , this.position.y , this.position.z )
		) ;
	}
	else {
		light.position.set( this.position.x , this.position.y , this.position.z ) ;
	}
} ;



// Light color/intensity/...
GEntity.prototype.updateLight = function( data , volatile = false ) {
	console.warn( "3D GEntity.updateLight()" , data ) ;
	if ( data.special.light === undefined ) { return ; }

	// Create/remove light
	if ( ! data.special.light !== ! this.lightEmitting ) {
		this.lightEmitting = !! data.special.light ;
		
		if ( ! this.lightEmitting ) {
			if ( this.babylon.light ) {
				this.babylon.light.dispose() ;
			}
			this.special.light = null ;
			return ;
		}
		
		this.createLight() ;
	}

	if ( ! data.special.light || typeof data.special.light !== 'object' ) { return ; }

	var scene = this.gScene.babylon.scene ,
		light = this.babylon.light ;

	if ( data.special.light.diffuse && typeof data.special.light.diffuse === 'object' ) {
		this.special.light.diffuse = data.special.light.diffuse ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'diffuse' ,
				Babylon.Animation.ANIMATIONTYPE_COLOR3 ,
				new Babylon.Color3( this.special.light.diffuse.r , this.special.light.diffuse.g , this.special.light.diffuse.b )
			) ;
		}
		else {
			light.diffuse.set( this.special.light.diffuse.r , this.special.light.diffuse.g , this.special.light.diffuse.b ) ;
		}
	}

	if ( data.special.light.specular && typeof data.special.light.specular === 'object' ) {
		this.special.light.specular = data.special.light.specular ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'specular' ,
				Babylon.Animation.ANIMATIONTYPE_COLOR3 ,
				new Babylon.Color3( this.special.light.specular.r , this.special.light.specular.g , this.special.light.specular.b )
			) ;
		}
		else {
			light.specular.set( this.special.light.specular.r , this.special.light.specular.g , this.special.light.specular.b ) ;
		}
	}

	if ( data.special.light.intensity !== undefined ) {
		this.special.light.intensity = data.special.light.intensity ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'intensity' ,
				Babylon.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.light.intensity
			) ;
		}
		else {
			light.intensity = this.special.light.intensity ;
		}
	}
} ;



GEntity.prototype.createLight = function() {
	console.warn( "@@@@@@@@@@@@@@@@@@@@@@@@@ GEntity.createLight()" ) ;
	var scene = this.gScene.babylon.scene ;

	if ( ! this.special.light ) {
		this.special.light = {
			diffuse: new Babylon.Color3( 1 , 1 , 1 ) ,
			specular: new Babylon.Color3( 0.5 , 0.5 , 0.5 ) ,
			intensity: 1
		} ;
	}

	this.babylon.light = new Babylon.PointLight(
		"pointLight" ,
		new Babylon.Vector3( this.position.x , this.position.y , this.position.z ) ,
		scene
	) ;

	this.babylon.light.diffuse = this.special.light.diffuse ;
	this.babylon.light.specular = this.special.light.specular ;
	this.babylon.light.intensity = this.special.light.intensity ;
} ;

