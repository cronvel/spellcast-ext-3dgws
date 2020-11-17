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
	this.id = data.id || null ;
	this.dom = dom ;	// Dom instance, immutable
	this.gScene = gScene ;
	this.usage = data.usage || 'sprite' ;	// immutable
	this.transient = data.transient || undefined ;	// immutable
	this.parent = undefined ;	// immutable, set later in the constructor

	this.show = false ;
	this.persistent = true ;
	this.button = null ;
	this.theme = null ;
	this.texturePack = null ;	// A name, not the instance, see this.texturePackObject for the instance
	this.variant = 'default' ;	// A name, not the instance, see this.variantObject for the instance
	this.opacity = 1 ;
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
	this.opacity = 1 ;

	this.special = {} ;
	this.meta = {} ;
	this.engine = {} ;
	this.parametric = null ;

	// Internals
	
	this.clientMods = {		// Things that are not server-side
		variant: null ,		// A variant affix that is automatically computed
		xFlipVariant: null ,	// A variant that can be used flipped
		xFlip: false
	} ;

	this.updateMeshNeeded = true ;
	this.updateMaterialNeeded = true ;
	this.createLightNeeded = false ;
	this.texturePackObject = null ;	// The TexturePack instance
	this.variantObject = null ;		// The Variant instance
	this.lightEmitting = false ;
	
	this.children = new Set() ;
	if ( data.parent ) { this.setParent( data.parent ) ; }
	
	this.babylon = {
		material: null ,
		mesh: null ,
		light: null		// Attached light, if any
	} ;

	this.defineStates( 'loaded' , 'loading' ) ;
	
	if ( this.transient ) {
		setTimeout( () => this.destroy() , this.transient * 1000 ) ;
	}
}

GEntity.prototype = Object.create( Ngev.prototype ) ;
GEntity.prototype.constructor = GEntity ;

module.exports = GEntity ;



GEntity.prototype.localBBoxSize = 1 ;



// TODO
GEntity.prototype.destroy = function() {
	if ( this.children.size ) {
		for ( let child of this.children ) {
			child.destroy() ;
		}
	}

	if ( this.babylon.mesh ) {
		this.babylon.mesh.parent = null ;
		this.babylon.mesh.dispose() ;
	}

	if ( this.babylon.material ) {
		this.babylon.material.dispose(
			false , // forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true    // notBoundToMesh
		) ;
	}

	this.gScene.removeGEntity( this.id ) ;
	this.destroyed = true ;
} ;



GEntity.prototype.setParent = function( parentId ) {
	var parent = this.gScene.gEntities[ parentId ] ;
	if ( ! parent ) { return ; }
	this.parent = parent ;
	parent.addChild( this ) ;
} ;



GEntity.prototype.addChild = function( child ) {
	// Derivated class may have specific works here...
	this.children.add( child ) ;
} ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
GEntity.prototype.update = async function( data , awaiting = false , initial = false ) {
	console.warn( "3D GEntity.update()" , data ) ;

	if ( data.transition ) {
		if ( initial ) { delete data.transition ; }
		else { data.transition = new GTransition( data.transition ) ; }
	}

	// Structural/discrete part

	if ( data.engine !== undefined ) { await this.updateEngine( data.engine ) ; }

	if ( data.special !== undefined ) { await this.updateSpecialStage1( data ) ; }

	if ( data.texturePack !== undefined || data.variant !== undefined || data.theme !== undefined ) {
		await this.updateTexture( data.texturePack , data.variant , data.theme ) ;
	}

	if ( this.updateMeshNeeded ) { await this.updateMesh() ; }
	if ( this.updateMaterialNeeded ) { await this.updateMaterial() ; }

	// /!\ This createLightNeeded thing is not coded very well, need refacto... /!\
	if ( this.createLightNeeded ) {
		this.createLightNeeded = false ;
		this.lightEmitting = true ;
		await this.createLight() ;
	}

	if ( data.special !== undefined ) { await this.updateSpecialStage2( data ) ; }

	//if ( data.button !== undefined ) { this.updateButton( data.button ) ; }

	// Continuous part

	if ( typeof data.opacity === 'number' ) { this.updateOpacity( data.opacity ) ; }

	if ( data.origin !== undefined ) { this.updateOrigin( data.origin ) ; }

	if ( data.direction !== undefined ) { this.updateDirection( data.direction ) ; }
	if ( data.facing !== undefined ) { this.updateFacing( data.facing ) ; }

	if ( data.position !== undefined || data.positionMode !== undefined ) { this.updatePosition( data ) ; }
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
				this.parametric = new Parametric( data.parametric ) ;
			}
			else {
				this.parametric.update( data.parametric ) ;
			}
		}
		console.warn( "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ 3D GEntity.update() parametric" , data ) ;
	}

	return ( awaiting && data.transition && data.transition.promise ) || Promise.resolved ;
} ;



// Not to be confused with .updateParametric() (which don't exist).
// This does not update the parametric value (done by this.parametric.update()),
// but instead update based on actual parametric formulas.
GEntity.prototype.parametricUpdate = function( absoluteT ) {
	var data = this.parametric.compute( absoluteT , this ) ;

	if ( ! data ) {
		// If data is null, then the animation have finished, we can remove it.
		this.parametric = null ;
		this.gScene.parametricGEntities.delete( this ) ;
		return ;
	}

	if ( typeof data.opacity === 'number' ) { this.updateOpacity( data.opacity , true ) ; }

	if ( data.position !== undefined || data.positionMode !== undefined ) { this.updatePosition( data , true ) ; }
	if ( data.rotation !== undefined || data.rotationMode !== undefined ) { this.updateRotation( data , true ) ; }
	if ( data.size !== undefined || data.sizeMode !== undefined ) { this.updateSize( data , true ) ; }
} ;



GEntity.prototype.updateEngine = function( engineData ) {} ;
GEntity.prototype.updateSpecialStage1 = function( data ) {} ;



GEntity.prototype.updateSpecialStage2 = function( data ) {
	if ( data.special.light !== undefined ) {
		this.updateLight( data ) ;
	}

	if ( data.special && data.special.material ) {
		this.updateMaterialParams( data.special.material ) ;
	}
} ;



// By default, changing the facing direction does nothing
GEntity.prototype.updateDirection = function( direction ) { this.direction = direction ; } ;
GEntity.prototype.updateFacing = function( facing ) { this.facing = facing ; } ;
GEntity.prototype.updateMesh = function() { this.updateMeshNeeded = false ; } ;



// Refresh all the material stack, from texture to actual Babylon material
GEntity.prototype.refreshMaterial = function() {
	this.updateTexture() ;
	if ( this.updateMaterialNeeded ) { this.updateMaterial() ; }
}



// Basic/common material
GEntity.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntity.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	this.babylon.material = material = new Babylon.StandardMaterial( 'basicMaterial' , scene ) ;

	material.ambientColor = new Babylon.Color3( 1 , 1 , 1 ) ;
	material.diffuseColor = new Babylon.Color3( 0 , 0 , 0 ) ;
	material.specularColor = new Babylon.Color3( 0 , 0 , 0 ) ;
	material.emissiveColor = new Babylon.Color3( 0 , 0 , 0 ) ;

	material.backFaceCulling = true ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }
	
	//if ( ! mesh ) { console.warn( "@@@@@@@@@@@@@@@@@@!!!!!!!!!!! mesh undefined!" , Object.getPrototypeOf( this ).constructor.name ) ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntity.prototype.updateMaterialParams = function( params , volatile = false ) {
	var r , g , b ,
		material = this.babylon.material ;

	console.warn( "@@@@@@@@@@@@@@@@@@ updateMaterialParams()" , params ) ;
	if ( params.ambient && typeof params.ambient === 'object' ) {
		if ( ! this.special.ambient ) { this.special.ambient = { r: 1 , g: 1 , b: 1 } ; }

		r = params.ambient.r !== undefined ? params.ambient.r : this.special.ambient.r ,
		g = params.ambient.g !== undefined ? params.ambient.g : this.special.ambient.g ,
		b = params.ambient.b !== undefined ? params.ambient.b : this.special.ambient.b ;

		if ( ! volatile ) {
			this.special.ambient.r = r ;
			this.special.ambient.g = g ;
			this.special.ambient.b = b ;
		}
		
		material.ambientColor.set( r , g , b ) ;
	}

	if ( params.diffuse && typeof params.diffuse === 'object' ) {
		if ( ! this.special.diffuse ) { this.special.diffuse = { r: 0 , g: 0 , b: 0 } ; }

		r = params.diffuse.r !== undefined ? params.diffuse.r : this.special.diffuse.r ,
		g = params.diffuse.g !== undefined ? params.diffuse.g : this.special.diffuse.g ,
		b = params.diffuse.b !== undefined ? params.diffuse.b : this.special.diffuse.b ;

		if ( ! volatile ) {
			this.special.diffuse.r = r ;
			this.special.diffuse.g = g ;
			this.special.diffuse.b = b ;
		}
		
		material.diffuseColor.set( r , g , b ) ;
	}

	if ( params.specular && typeof params.specular === 'object' ) {
		if ( ! this.special.specular ) { this.special.specular = { r: 0 , g: 0 , b: 0 } ; }

		r = params.specular.r !== undefined ? params.specular.r : this.special.specular.r ,
		g = params.specular.g !== undefined ? params.specular.g : this.special.specular.g ,
		b = params.specular.b !== undefined ? params.specular.b : this.special.specular.b ;

		if ( ! volatile ) {
			this.special.specular.r = r ;
			this.special.specular.g = g ;
			this.special.specular.b = b ;
		}
		
		material.specularColor.set( r , g , b ) ;
	}

	if ( params.emissive && typeof params.emissive === 'object' ) {
		console.warn( "@@@@@@@@@@@@@@@@@@ updateMaterialParams() emissive" , params.emissive ) ;
		if ( ! this.special.emissive ) { this.special.emissive = { r: 0 , g: 0 , b: 0 } ; }

		r = params.emissive.r !== undefined ? params.emissive.r : this.special.emissive.r ,
		g = params.emissive.g !== undefined ? params.emissive.g : this.special.emissive.g ,
		b = params.emissive.b !== undefined ? params.emissive.b : this.special.emissive.b ;

		if ( ! volatile ) {
			this.special.emissive.r = r ;
			this.special.emissive.g = g ;
			this.special.emissive.b = b ;
		}
		
		material.emissiveColor.set( r , g , b ) ;
	}
} ;



GEntity.prototype.updateOpacity = function( opacity , volatile = false ) {
	var material = this.babylon.material ;
	if ( ! material ) { return ; }

	if ( opacity < 0 ) { opacity = 0 ; }
	else if ( opacity > 1 ) { opacity = 1 ; }

	if ( ! volatile ) { this.opacity = opacity ; }
	material.alpha = opacity ;
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

	this.variantObject = variant ;
	this.texturePackObject = texturePack ;
	
	// /!\ SHOULD CHECK IF SOMETHING CHANGED instead of always update the material
	
	this.updateMaterialNeeded = true ;
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
	//console.warn( "3D GEntity.updatePosition()" , data ) ;
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
		//console.warn( "mesh:" , mesh ) ;
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
	if ( ! this.babylon.mesh ) {
		throw new Error( "Non pure light GEntity needs a mesh to be light-emitting" ) ;
	}

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
		new Babylon.Vector3( 0 , 0 , 0 ) ,
		scene
	) ;

	this.babylon.light.parent = this.babylon.mesh ;

	this.babylon.light.diffuse = this.special.light.diffuse ;
	this.babylon.light.specular = this.special.light.specular ;
	this.babylon.light.intensity = this.special.light.intensity ;
} ;

