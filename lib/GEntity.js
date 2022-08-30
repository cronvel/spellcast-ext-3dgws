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

/* global BABYLON */



const GTransition = require( './GTransition.js' ) ;
const Parametric = require( './Parametric.js' ) ;

//const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const LeanEvents = require( 'nextgen-events/lib/LeanEvents.js' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
function GEntity( dom , gScene , data ) {
	this.id = data.id || null ;
	this.gScene = gScene ;
	this.gScene.registerGEntity( this.id , this ) ;	// Immediately check that we can register it

	this.dom = dom ;	// Dom instance, immutable
	this.usage = data.usage || 'sprite' ;	// immutable
	this.parent = undefined ;	// immutable, set later in the constructor
	this.parentMode = undefined ;	// immutable, set later in the constructor
	this.parentTransformNode = undefined ;	// immutable, set later in the constructor
	this.transient = data.transient || undefined ;	// immutable
	this.destroyed = false ;

	this.show = false ;
	this.persistent = true ;
	this.button = null ;
	this.theme = null ;
	this.texturePack = null ;	// A name, not the instance, see this.texturePackObject for the instance
	this.variant = 'default' ;	// A name, not the instance, see this.variantObject for the instance
	this.frame = 0 ;			// An index, not the instance
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
	this.billboard = null ;
	this.opacity = 1 ;

	this.special = {} ;
	this.meta = {} ;
	this.engine = {} ;
	this.parametric = null ;

	// Internals

	this.clientMods = {		// Things that are not server-side
		variant: null ,		// A variant affix that is automatically computed
		xFlipVariant: null ,	// A variant that can be used flipped
		xFlip: false ,
		origin: null ,
		position: null ,
		size: null
	} ;

	this.firstUpdate = true ;
	this.updateMeshNeeded = true ;
	this.updateMaterialNeeded = true ;
	this.createLightNeeded = false ;
	this.texturePackObject = null ;	// The TexturePack instance
	this.variantObject = null ;		// The Variant instance
	this.frameObject = null ;		// The Frame instance
	this.lightEmitting = false ;

	this.textureCache = {} ;
	this.textureAnimationTimer = null ;

	this.children = new Set() ;
	this.transformNodes = {} ;
	this.perPropertyTransformNodes = {} ;
	if ( data.parent ) { this.setParent( data.parent , data.parentMode ) ; }

	this.babylon = {
		material: null ,
		mesh: null ,
		light: null ,	// Attached light, if any
		texture: null ,	// Only relevant for material-less entity, like particle system
		particleSystem: null
	} ;

	this.nextTextureFrame = this.nextTextureFrame.bind( this ) ;

	this.defineStates( 'loaded' , 'loading' ) ;

	if ( this.noLocalLighting ) {
		this.gScene.noLocalLightingGEntities.add( this ) ;
		this.gScene.once( 'render' , () => this.gScene.updateLightExcludedMeshes() , { unique: true , id: 'updateLightExcludedMeshes' } ) ;
	}
}

//GEntity.prototype = Object.create( Ngev.prototype ) ;
GEntity.prototype = Object.create( LeanEvents.prototype ) ;
GEntity.prototype.constructor = GEntity ;

module.exports = GEntity ;



GEntity.prototype.localBBoxSize = 1 ;
GEntity.prototype.noLocalLighting = false ;		// Is it sensible to local lights (point-light/spot-light)?
GEntity.prototype.isLocalLight = true ;			// Is it a local light (point-light/spot-light)?
GEntity.prototype.noParentScaling = false ;		// Is scaling dependent on parent?
GEntity.prototype.forceZScalingToX = false ;	// Force z-scale to X, useful for sprite-like



GEntity.prototype.destroy = function() {
	if ( this.destroyed ) { return ; }

	if ( this.noLocalLighting ) {
		this.gScene.noLocalLightingGEntities.remove( this ) ;
		this.gScene.once( 'render' , () => this.gScene.updateLightExcludedMeshes() , { unique: true , id: 'updateLightExcludedMeshes' } ) ;
	}

	if ( this.children.size ) {
		for ( let child of this.children ) {
			child.destroy() ;
		}
	}

	for ( let transformNode in this.transformNodes ) {
		transformNode.dispose() ;
	}

	if ( this.babylon.mesh ) {
		this.babylon.mesh.parent = null ;
		this.babylon.mesh.dispose() ;
		this.babylon.mesh = null ;
	}

	if ( this.babylon.material ) {
		this.babylon.material.dispose(
			false , // forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true    // notBoundToMesh
		) ;
		this.babylon.material = null ;
	}

	if ( this.babylon.texture ) {
		this.babylon.texture.dispose() ;
		this.babylon.texture = null ;
	}

	if ( this.babylon.particleSystem ) {
		this.babylon.particleSystem.dispose() ;
		this.babylon.particleSystem = null ;
	}

	this.gScene.unregisterGEntity( this.id ) ;
	this.destroyed = true ;
} ;



const PARENT_MODES = {
	default: { mesh: true }
} ;



GEntity.prototype.setParent = function( parentId , parentMode ) {
	var parent = this.gScene.gEntities[ parentId ] ;
	if ( ! parent ) { return ; }
	this.parent = parent ;

	if ( typeof parentMode === 'string' ) { parentMode = PARENT_MODES[ parentMode ] || PARENT_MODES.default ; }
	if ( ! parentMode || typeof parentMode !== 'object' ) { parentMode = PARENT_MODES.default ; }

	this.parentMode = {
		mesh: !! parentMode.mesh ,
		position: {
			all: false , x: false , y: false , z: false
		}
	} ;

	if ( parentMode.position ) {
		if ( typeof parentMode.position === 'object' ) {
			this.parentMode.position.x = !! parentMode.position.x ;
			this.parentMode.position.y = !! parentMode.position.y ;
			this.parentMode.position.z = !! parentMode.position.z ;
			this.parentMode.position.all = this.parentMode.position.x && this.parentMode.position.y && this.parentMode.position.z ;
		}
		else {
			this.parentMode.position.all = this.parentMode.position.x = this.parentMode.position.y = this.parentMode.position.z = true ;
		}
	}

	parent.addChild( this ) ;
	this.parentTransformNode = parent.ensureTransformNode( this.parentMode ) ;
} ;



GEntity.prototype.addChild = function( child ) {
	// Derivated class may have specific works here...
	this.children.add( child ) ;
} ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
GEntity.prototype.update = async function( data , awaiting = false , initial = false ) {
	console.warn( "3D GEntity.update()" , data ) ;
	if ( data.delay ) { await Promise.resolveTimeout( data.delay * 1000 ) ; }
	if ( this.firstUpdate ) {
		if ( typeof this.transient === 'number' ) { setTimeout( () => this.destroy() , this.transient * 1000 ) ; }
		this.firstUpdate = false ;
	}

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
	if ( data.billboard !== undefined ) { this.updateBillboard( data.billboard ) ; }

	if ( data.position !== undefined || data.positionMode !== undefined ) { this.updatePosition( data ) ; }
	if ( data.rotation !== undefined || data.rotationMode !== undefined ) { this.updateRotation( data ) ; }
	if ( data.size !== undefined || data.sizeMode !== undefined ) { this.updateSize( data.size ) ; }

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
		// If data is null, then the animation has finished, we can remove it.
		this.parametric = null ;
		this.gScene.parametricGEntities.delete( this ) ;
		return ;
	}

	if ( typeof data.opacity === 'number' ) { this.updateOpacity( data.opacity , true ) ; }

	if ( data.position !== undefined || data.positionMode !== undefined ) { this.updatePosition( data , true ) ; }
	if ( data.rotation !== undefined || data.rotationMode !== undefined ) { this.updateRotation( data , true ) ; }
	if ( data.size !== undefined || data.sizeMode !== undefined ) { this.updateSize( data.size , true ) ; }
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



const BBM_X = BABYLON.AbstractMesh.BILLBOARDMODE_X ,
	BBM_Y = BABYLON.AbstractMesh.BILLBOARDMODE_Y ,
	BBM_Z = BABYLON.AbstractMesh.BILLBOARDMODE_Z ;

const BILLBOARD_MODES = {
	none: 0 ,
	all: BBM_X | BBM_Y | BBM_Z ,
	xyz: BBM_X | BBM_Y | BBM_Z ,
	xy: BBM_X | BBM_Y ,
	xz: BBM_X | BBM_Z ,
	yz: BBM_Y | BBM_Z ,
	x: BBM_X ,
	y: BBM_Y ,
	z: BBM_Z
} ;

GEntity.BILLBOARD_MODES = BILLBOARD_MODES ;	// Could useful for derivated classes



GEntity.prototype.updateBillboard = function( billboard ) {
	var mesh = this.babylon.mesh ;
	this.billboard = billboard ;

	if ( mesh ) {
		mesh.billboardMode = BILLBOARD_MODES[ this.billboard ] || 0 ;
	}
} ;



// Called by .updateMesh()
GEntity.prototype.updateMeshParent = function() {
	if ( ! this.parent || ! this.babylon.mesh ) { return ; }

	var pNode , mesh = this.babylon.mesh ;

	if ( this.parentMode.mesh ) {
		pNode = this.parent.babylon.mesh ;

		if ( pNode ) {
			mesh.parent = pNode ;
			if ( this.noParentScaling ) { this.updateSize( this.size ) ; }
		}
	}
	else if ( this.parentTransformNode ) {
		mesh.parent = this.parentTransformNode ;
	}
} ;



// Refresh all the material stack, from texture to actual Babylon material
GEntity.prototype.refreshMaterial = async function() {
	this.updateTexture() ;
	if ( this.updateMaterialNeeded ) { await this.updateMaterial() ; }
} ;



// Basic/common material
GEntity.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntity.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'basicMaterial' , scene ) ;

	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;
	material.diffuseColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.emissiveColor = new BABYLON.Color3( 0 , 0 , 0 ) ;

	material.backFaceCulling = true ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	//if ( ! mesh ) { console.warn( "@@@@@@@@@@@@@@@@@@!!!!!!!!!!! mesh undefined!" , Object.getPrototypeOf( this ).constructor.name , this.id ) ; }

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

	var diffuse = params.diffuse || params.albedo ;
	if ( diffuse && typeof diffuse === 'object' ) {
		if ( ! this.special.diffuse ) { this.special.diffuse = { r: 0 , g: 0 , b: 0 } ; }

		r = diffuse.r !== undefined ? diffuse.r : this.special.diffuse.r ,
		g = diffuse.g !== undefined ? diffuse.g : this.special.diffuse.g ,
		b = diffuse.b !== undefined ? diffuse.b : this.special.diffuse.b ;

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
// frameIndex is optional, in this case either it does not change if variant remains unchanged, or it default to 0
GEntity.prototype.updateTexture = function( texturePackId , variantId , themeId , frameIndex , keepAnimationSchedule = false ) {
	var texturePack , variant , frame ;

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


	var oldXFlip = this.clientMods.xFlip ;
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

	if ( variant === this.variantObject ) {
		if ( frameIndex !== undefined ) {
			this.frame = variant.frames[ frameIndex ] ? + frameIndex : 0 ;
		}
	}
	else {
		this.frame = frameIndex !== undefined && variant.frames[ frameIndex ] ? + frameIndex : 0 ;
	}

	frame = variant.frames[ this.frame ] || variant.frames[ 0 ] ;

	// Preloading the texturePack on change
	if ( texturePack !== this.texturePackObject ) {
		this.whenTextureCacheReady().then( () => {
			// Check that the texturePack has not changed in between, otherwise it would be useless
			if ( texturePack === this.texturePackObject ) { this.preloadTexturePack() ; }
		} ) ;
	}

	// Check if something changed
	if (
		texturePack === this.texturePackObject && variant === this.variantObject &&
		frame === this.frameObject && oldXFlip === this.clientMods.xFlip
	) {
		return ;
	}

	this.texturePackObject = texturePack ;
	this.variantObject = variant ;
	this.frameObject = frame ;

	if ( this.variantObject.animation ) {
		this.startTextureAnimation( ! keepAnimationSchedule ) ;
	}
	else {
		this.stopTextureAnimation() ;
	}

	this.updateMaterialNeeded = true ;
} ;



GEntity.prototype.startTextureAnimation = function( reset = false ) {
	//console.warn( "_____________________________ startTextureAnimation" , this.variantObject , this.variantObject.animation ) ;
	if ( ! this.variantObject.animation ) {
		if ( this.textureAnimationTimer ) {
			clearTimeout( this.textureAnimationTimer ) ;
			this.textureAnimationTimer = null ;
		}

		return ;
	}

	if ( this.textureAnimationTimer ) {
		if ( ! reset ) { return ; }
		clearTimeout( this.textureAnimationTimer ) ;
		this.textureAnimationTimer = null ;
	}

	//console.warn( "_____________________________ startTextureAnimation: ok for" , this.frameObject.duration ) ;
	this.textureAnimationTimer = setTimeout( this.nextTextureFrame , 1000 * this.frameObject.duration ) ;
} ;



GEntity.prototype.stopTextureAnimation = function() {
	//console.warn( "_____________________________ stopTextureAnimation" ) ;
	if ( this.textureAnimationTimer ) {
		clearTimeout( this.textureAnimationTimer ) ;
		this.textureAnimationTimer = null ;
	}
} ;



GEntity.prototype.nextTextureFrame = function() {
	//console.warn( "___________________________ nextTextureFrame BEFORE" , this.frame , this.frameObject ) ;
	if ( this.frame >= this.variantObject.frames.length - 1 ) {
		if ( this.variantObject.animation === 'loop' ) {
			this.frame = 0 ;
		}
		else {
			this.stopTextureAnimation() ;
			return ;
		}
	}
	else {
		this.frame ++ ;
	}

	this.frameObject = this.variantObject.frames[ this.frame ] ;
	//console.warn( "___________________________ nextTextureFrame AFTER" , this.frame , this.frameObject ) ;
	this.textureAnimationTimer = setTimeout( this.nextTextureFrame , 1000 * this.frameObject.duration ) ;
	this.updateMaterial() ;
} ;



// Here clientMods is an override
GEntity.prototype.updateOrigin = function( newOrigin , isClientMod = false ) {
	if ( this.clientMods.origin && ! isClientMod ) {
		this.origin = newOrigin ;
		return ;
	}

	var currentOrigin = this.clientMods.origin || this.origin ;

	// First check if there is a difference between them...
	if ( currentOrigin.x === newOrigin.x && currentOrigin.y === newOrigin.y && currentOrigin.z === newOrigin.z ) { return ; }

	var mesh = this.babylon.mesh ,
		rate = this.localBBoxSize / 2 ;

	// For each axis, 0 is middle of BBox, -1 is lower bound, +1 is upper bound
	mesh.bakeTransformIntoVertices( BABYLON.Matrix.Translation(
		( currentOrigin.x - newOrigin.x ) * rate ,
		( currentOrigin.y - newOrigin.y ) * rate ,
		( currentOrigin.z - newOrigin.z ) * rate
	) ) ;

	if ( isClientMod ) { this.clientMods.origin = newOrigin ; }
	else { this.origin = newOrigin ; }
} ;



GEntity.prototype.updatePosition = function( data , volatile = false , isClientMod = false ) {
	//console.warn( "3D GEntity.updatePosition()" , data ) ;
	var x , y , z , trNodeX , trNodeY , trNodeZ ,
		oldCMPosition = this.clientMods.position ,
		position = data.position ,
		mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( isClientMod ) {
		// Don't use this.position, it would mess with parametric animation, use actual mesh's position
		if ( oldCMPosition ) {
			// Early exit
			if ( position.x === oldCMPosition.x && position.y === oldCMPosition.y && position.z === oldCMPosition.z ) { return ; }

			// We use the delta
			x = mesh.position.x - oldCMPosition.x ;
			y = mesh.position.y - oldCMPosition.y ;
			z = mesh.position.z - oldCMPosition.z ;
		}
		else {
			// Early exit
			if ( ! position.x && ! position.y && ! position.z ) { return ; }

			x = mesh.position.x ;
			y = mesh.position.y ;
			z = mesh.position.z ;
		}

		this.clientMods.position = position ;
	}
	else if ( volatile ) {
		x = position.x !== undefined ? position.x : this.position.x ;
		y = position.y !== undefined ? position.y : this.position.y ;
		z = position.z !== undefined ? position.z : this.position.z ;
	}
	else {
		x = this.position.x = position.x !== undefined ? position.x : this.position.x ;
		y = this.position.y = position.y !== undefined ? position.y : this.position.y ;
		z = this.position.z = position.z !== undefined ? position.z : this.position.z ;
	}

	if ( ! mesh ) { return ; }

	trNodeX = x ;
	trNodeY = y ;
	trNodeZ = z ;

	//*
	if ( this.clientMods.position ) {
		x += this.clientMods.position.x ;
		y += this.clientMods.position.y ;
		z += this.clientMods.position.z ;
	}
	//*/

	if ( data.transition ) {
		//console.warn( "mesh:" , mesh ) ;
		// Animation using easing
		data.transition.createAnimation(
			scene ,
			mesh ,
			'position' ,
			BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
			new BABYLON.Vector3( x , y , z )
		) ;
		if ( this.perPropertyTransformNodes.position?.length ) { this.updatePositionOfTransformNodesWithTransition( data.transition , trNodeX , trNodeY , trNodeZ ) ; }
	}
	else {
		mesh.position.set( x , y , z ) ;
		if ( this.perPropertyTransformNodes.position?.length ) { this.updatePositionOfTransformNodes( trNodeX , trNodeY , trNodeZ ) ; }
	}
} ;



GEntity.prototype.ensureTransformNode = function( params ) {
	var key = '' ;

	if ( params.position.all ) { key += 'Pall' ; }
	else {
		if ( params.position.x ) { key += 'Px' ; }
		if ( params.position.y ) { key += 'Py' ; }
		if ( params.position.z ) { key += 'Pz' ; }
	}

	if ( this.transformNodes[ key ] ) { return this.transformNodes[ key ] ; }

	var node = this.transformNodes[ key ] = new BABYLON.TransformNode( key , this.scene ) ;
	node.__key = key ;
	node.__px = node.__py = node.__pz = 0 ;

	if ( params.position.all ) {
		node.position.set( this.position.x , this.position.y , this.position.z ) ;
		node.__px = node.__py = node.__pz = 1 ;
		if ( ! this.perPropertyTransformNodes.position ) { this.perPropertyTransformNodes.position = [] ; }
		this.perPropertyTransformNodes.position.push( node ) ;
	}
	else if ( params.position.x || params.position.y || params.position.z ) {
		if ( params.position.x ) { node.position.x = this.position.x ; node.__px = 1 ; }
		if ( params.position.y ) { node.position.y = this.position.y ; node.__py = 1 ; }
		if ( params.position.z ) { node.position.z = this.position.z ; node.__pz = 1 ; }
		if ( ! this.perPropertyTransformNodes.position ) { this.perPropertyTransformNodes.position = [] ; }
		this.perPropertyTransformNodes.position.push( node ) ;
	}

	return node ;
} ;



GEntity.prototype.updatePositionOfTransformNodes = function( x , y , z ) {
	for ( let node of this.perPropertyTransformNodes.position ) {
		node.position.set( node.__px * x , node.__py * y , node.__pz * z ) ;
	}
} ;



GEntity.prototype.updatePositionOfTransformNodesWithTransition = function( transition , x , y , z ) {
	for ( let node of this.perPropertyTransformNodes.position ) {
		transition.createAnimation(
			this.scene ,
			node ,
			'position' ,
			BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
			new BABYLON.Vector3( node.__px * x , node.__py * y , node.__pz * z )
		) ;
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

	//mesh.angle = z ;

	if ( data.transition ) {
		//console.warn( "mesh:" , mesh ) ;
		// Animation using easing

		data.transition.createAnimation(
			scene ,
			mesh ,
			'rotation' ,
			BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
			new BABYLON.Vector3( x , y , z )
		) ;
	}
	else {
		mesh.rotation.set( x , y , z ) ;
	}
} ;



// Here clientMods multiply over base size
GEntity.prototype.updateSize = function( size , volatile = false , isClientMod = false ) {
	console.warn( "3D GEntity.updateSize()" , size ) ;
	var x , y , z ,
		mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( isClientMod ) {
		this.clientMods.size = {
			x: size.x !== undefined ? size.x : 1 ,
			y: size.y !== undefined ? size.y : 1 ,
			z: size.z !== undefined ? size.z : 1
		} ;

		x = this.size.x ;
		y = this.size.y ;
		z = this.size.z ;
	}
	else if ( volatile ) {
		x = size.x !== undefined ? size.x : this.size.x ;
		y = size.y !== undefined ? size.y : this.size.y ;
		z = size.z !== undefined ? size.z : this.size.z ;
	}
	else {
		x = this.size.x = size.x !== undefined ? size.x : this.size.x ;
		y = this.size.y = size.y !== undefined ? size.y : this.size.y ;
		z = this.size.z = size.z !== undefined ? size.z : this.size.z ;
	}

	if ( ! mesh ) { return ; }

	if ( this.clientMods.size ) {
		x *= this.clientMods.size.x ;
		y *= this.clientMods.size.y ;
		z *= this.clientMods.size.z ;
	}

	// /!\ USELESS! Should use indirect parenting (e.g. parentMode.position)
	if ( this.parent && this.noParentScaling ) {
		let parentMesh = this.parent.babylon.mesh ;

		// Compensate for the parent scaling which enlarge and deform the child
		x /= parentMesh.scaling.x ;
		y /= parentMesh.scaling.y ;
		z /= parentMesh.scaling.z ;
	}

	mesh.scaling.x = x ;
	mesh.scaling.y = y ;
	mesh.scaling.z = this.forceZScalingToX ? x : z ;
} ;



// Light color/intensity/...
GEntity.prototype.updateLight = function( data , volatile = false ) {
	console.warn( "3D GEntity.updateLight()" , data ) ;
	if ( data.special.light === undefined ) { return ; }

	// Create/remove light
	if ( ! data.special.light !== ! this.lightEmitting ) {
		this.lightEmitting = !! data.special.light ;

		if ( ! this.lightEmitting ) {
			this.destroyLight() ;
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
				BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
				new BABYLON.Color3( this.special.light.diffuse.r , this.special.light.diffuse.g , this.special.light.diffuse.b )
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
				BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
				new BABYLON.Color3( this.special.light.specular.r , this.special.light.specular.g , this.special.light.specular.b )
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
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
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
			diffuse: new BABYLON.Color3( 1 , 1 , 1 ) ,
			specular: new BABYLON.Color3( 0.5 , 0.5 , 0.5 ) ,
			intensity: 1
		} ;
	}

	this.babylon.light = new BABYLON.PointLight(
		"pointLight" ,
		new BABYLON.Vector3( 0 , 0 , 0 ) ,
		scene
	) ;

	this.babylon.light.parent = this.babylon.mesh ;

	this.babylon.light.diffuse = this.special.light.diffuse ;
	this.babylon.light.specular = this.special.light.specular ;
	this.babylon.light.intensity = this.special.light.intensity ;

	if ( this.isLocalLight ) { this.registerLocalLight() ; }
} ;



GEntity.prototype.destroyLight = function() {
	if ( this.isLocalLight ) { this.unregisterLocalLight() ; }

	if ( this.babylon.light ) {
		this.babylon.light.dispose() ;
	}

	this.special.light = null ;
} ;



GEntity.prototype.registerLocalLight = function() {
	this.gScene.localLightGEntities.add( this ) ;
	this.babylon.light.excludedMeshes = [ ... this.gScene.noLocalLightingGEntities ].map( e => e.babylon.mesh ) ;
} ;



GEntity.prototype.unregisterLocalLight = function() {
	this.gScene.localLightGEntities.delete( this ) ;
} ;



GEntity.prototype.getTexture = function( url ) {
	var texture ,
		scene = this.gScene.babylon.scene ;

	url = this.dom.cleanUrl( url ) ;
	if ( this.textureCache[ url ] ) { return this.textureCache[ url ] ; }
	texture = this.textureCache[ url ] = new BABYLON.Texture( url , scene ) ;
	return texture ;
} ;



// Preload the whole texturePack, return a promise resolving when its done
GEntity.prototype.preloadTexturePack = function() {
	var variantName , variant , frame , mapName , textures = [] ;

	for ( variantName in this.texturePackObject.variants ) {
		variant = this.texturePackObject.variants[ variantName ] ;
		for ( frame of variant.frames ) {
			if ( frame.url ) { textures.push( this.getTexture( frame.url ) ) ; }
			if ( frame.maps ) {
				for ( mapName in frame.maps ) {
					textures.push( this.getTexture( frame.maps[ mapName ] ) ) ;
				}
			}
		}
	}

	return new Promise( resolve => BABYLON.Texture.WhenAllReady( textures , () => resolve() ) ) ;
} ;



// Return a promise resolving when all texture in the cache are ready
GEntity.prototype.whenTextureCacheReady = function() {
	return new Promise( resolve => BABYLON.Texture.WhenAllReady( [ ... Object.values( this.textureCache ) ] , () => resolve() ) ) ;
} ;



GEntity.prototype.flipTexture = function( texture , xFlip , yFlip ) {
	if ( xFlip ) {
		texture.uScale = -1 ;
		texture.uOffset = 1 ;
	}
	else {
		texture.uScale = 1 ;
		texture.uOffset = 0 ;
	}

	if ( yFlip ) {
		texture.vScale = -1 ;
		texture.vOffset = 1 ;
	}
	else {
		texture.vScale = 1 ;
		texture.vOffset = 0 ;
	}
} ;



GEntity.prototype.updateSizeFromPixelDensity = function( texture , pixelDensity ) {
	var size ;

	if ( texture.isReady() ) {
		//console.warn( "++++++++++++++++++++++++++++ Already READY" ) ;
		size = texture.getBaseSize() ;
		this.updateSize( { x: size.width / pixelDensity , y: size.height / pixelDensity } , false , true ) ;
	}
	else {
		//console.warn( "++++++++++++++++++++++++++++ When all ready: BEFORE" ) ;
		BABYLON.Texture.WhenAllReady( [ texture ] , () => {
			size = texture.getBaseSize() ;
			//console.warn( "++++++++++++++++++++++++++++ When all ready: READY" , size , size.width / this.texturePackObject.pixelDensity , size.height / this.texturePackObject.pixelDensity ) ;
			this.updateSize( { x: size.width / pixelDensity , y: size.height / pixelDensity } , false , true ) ;
		} ) ;
	}
} ;

