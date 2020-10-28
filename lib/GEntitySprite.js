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

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntitySprite( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;

	this.autoFacing = this.autoFacing.bind( this ) ;

	//this.babylon.billboardOrigin = new Babylon.Vector3( 0 , 0 , 0 ) ;
}

GEntitySprite.prototype = Object.create( GEntity.prototype ) ;
GEntitySprite.prototype.constructor = GEntitySprite ;

module.exports = GEntitySprite ;



GEntitySprite.prototype.updateEngine = function( engineData ) {
	if (
		engineData.spriteAutoFacing !== undefined
		&& ( engineData.spriteAutoFacing === false || vectorUtils.degToSector[ engineData.spriteAutoFacing ] )
		&& engineData.spriteAutoFacing !== this.engine.spriteAutoFacing
	) {
		this.engine.spriteAutoFacing = engineData.spriteAutoFacing ;

		//console.warn( "@@@@@@@@@@ engineData.spriteAutoFacing" , this.engine.spriteAutoFacing ) ;
		if ( this.engine.spriteAutoFacing ) {
			this.gScene.on( 'render' , this.autoFacing ) ;
		}
		else {
			this.gScene.off( 'render' , this.autoFacing ) ;
		}
	}
} ;



/*
GEntitySprite.prototype.updateDirection = function( direction ) {
	this.direction = direction ;
	if ( this.engine.spriteAutoFacing ) { this.autoFacing() ; }
} ;
*/
GEntitySprite.prototype.updateFacing = function( facing ) {
	this.facing = facing ;
	if ( this.engine.spriteAutoFacing ) { this.autoFacing() ; }
} ;



// Update the gEntity's texture
GEntitySprite.prototype.updateTexture_ = function( texturePack , variant ) {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntitySprite.updateTexture_()" , texturePack , variant ) ;

	var frame = variant.frames[ 0 ] ;
	this.babylon.material = material = new Babylon.StandardMaterial( 'spriteMaterial' , scene ) ;
	material.backFaceCulling = true ;

	material.ambientColor = new Babylon.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	var diffuseUrl = ( frame.maps && ( frame.maps.diffuse || frame.maps.albedo ) ) || frame.url
	material.diffuseTexture = new Babylon.Texture( this.dom.cleanUrl( diffuseUrl ) , scene ) ;
	material.diffuseTexture.hasAlpha = true ;
	material.diffuseTexture.wrapU = material.diffuseTexture.wrapV = Babylon.Texture.CLAMP_ADDRESSMODE ;

	// Normal/Bump
	var bumpUrl = frame.maps && ( frame.maps.normal || frame.maps.bump ) ;
	if ( bumpUrl ) {
		material.bumpTexture = new Babylon.Texture( this.dom.cleanUrl( bumpUrl ) , scene ) ;
		material.bumpTexture.wrapU = material.bumpTexture.wrapV = Babylon.Texture.CLAMP_ADDRESSMODE ;
		
		// BabylonJS use DirectX normalmap, but most software export OpenGL normalmap
		material.invertNormalMapX = true ;
		material.invertNormalMapY = true ;
	}
	
	// Specular
	var specularUrl = frame.maps && frame.maps.specular ;
	if ( specularUrl ) {
		material.specularTexture = new Babylon.Texture( this.dom.cleanUrl( specularUrl ) , scene ) ;
		material.specularTexture.wrapU = material.specularTexture.wrapV = Babylon.Texture.CLAMP_ADDRESSMODE ;
		//material.specularPower = 1 ;
		material.useGlossinessFromSpecularMapAlpha = true ;
	}
	else {
		//material.specularPower = 0 ;	// This is the sharpness of the highlight
		material.specularColor = new Babylon.Color3( 0 , 0 , 0 ) ;
	}

	/*
		Also:
			.ambientTexture is for ambient/occlusion
			.emissiveTexture
			.lightmapTexture
			.reflectionTexture
			.refractionTexture
			
	*/

	// X-flip and Y-Flip
	if ( ! variant.frames[ 0 ].xFlip !== ! this.clientMods.xFlip ) {
		material.diffuseTexture.uScale = -1 ;
		material.diffuseTexture.uOffset = 1 ;
		if ( material.bumpTexture ) {
			material.bumpTexture.uScale = -1 ;
			material.bumpTexture.uOffset = 1 ;
		}
		if ( material.specularTexture ) {
			material.specularTexture.uScale = -1 ;
			material.specularTexture.uOffset = 1 ;
		}
	}

	if ( variant.frames[ 0 ].yFlip ) {
		material.diffuseTexture.vScale = -1 ;
		material.diffuseTexture.vOffset = 1 ;
		if ( material.bumpTexture ) {
			material.bumpTexture.vScale = -1 ;
			material.bumpTexture.vOffset = 1 ;
		}
		if ( material.specularTexture ) {
			material.specularTexture.vScale = -1 ;
			material.specularTexture.vOffset = 1 ;
		}
	}

	// /!\ TEMP! Easier to debug!
	material.backFaceCulling = false ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}
} ;



// Size, positioning and rotation
GEntitySprite.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = Babylon.Mesh.CreatePlane( 'sprite' , undefined , scene ) ;	//, true ) ;

	//mesh.billboardMode = Babylon.AbstractMesh.BILLBOARDMODE_ALL;
	mesh.billboardMode = Babylon.AbstractMesh.BILLBOARDMODE_X | Babylon.AbstractMesh.BILLBOARDMODE_Y ;

	mesh.scaling.x = this.size.x ;
	mesh.scaling.y = this.size.y ;

	// Billboard mode is not sensible to pivot (as of v4.2.0-alpha31), this is a workaround for that, see:
	// https://forum.babylonjs.com/t/sprite-planting-i-e-sprite-origin-at-the-bottom/13337/8
	// Alternative is to mesh.bakeTransformIntoVertices(), done by this.updateOrigin()
	// Otherwise if/when 'usePivotForBillboardMode' option is accepted, use simply mesh.setPivot*()
	/*
	//this.babylon.billboardOrigin.y = -0.5 ;
	mesh.onAfterWorldMatrixUpdateObservable.add( () => {
		var pivot = this.babylon.billboardOrigin ,
			matrix = Babylon.TmpVectors.Matrix[ 0 ] ,
			worldMatrix = mesh.getWorldMatrix() ;

		// Apply pivot point
		matrix.setRowFromFloats( 0 , 1 , 0 , 0 , 0 ) ;
		matrix.setRowFromFloats( 1 , 0 , 1 , 0 , 0 ) ;
		matrix.setRowFromFloats( 2 , 0 , 0 , 1 , 0 ) ;
		matrix.setRowFromFloats( 3 , -pivot.x , -pivot.y , -pivot.z , 1 ) ;
		matrix.multiplyToRef( worldMatrix , worldMatrix ) ;
	} ) ;
	*/

	console.warn( 'Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



// Size, positioning and rotation
GEntitySprite.prototype.updateTransform = function( data ) {
	console.warn( "3D GEntitySprite.updateTransform()" , data ) ;
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( data.position ) {
		this.position = data.position ;

		if ( data.transition ) {
			console.warn( "mesh:" , mesh ) ;
			// Animation using easing

			data.transition.createAnimation(
				scene ,
				mesh ,
				'position' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.position.x , this.position.y , this.position.z )
			) ;
		}
		else {
			mesh.position.set( this.position.x , this.position.y , this.position.z ) ;
		}
	}

	if ( data.size ) {
		this.size = data.size ;
		mesh.scaling.x = this.size.x ;
		mesh.scaling.y = this.size.y ;
	}

	if ( data.rotation ) {
		this.rotation = data.rotation ;
		mesh.rotation.z = this.rotation.z ;
	}
} ;



GEntitySprite.prototype.autoFacing = function( changes = null ) {
	//console.warn( "@@@@@@@@@@ autoFacing()" , changes ) ;
	if ( changes ) {
		if ( ! changes.camera ) { return ; }
	}
	//console.warn( "@@@@@@@@@@ autoFacing() GO!" , changes && changes.camera ) ;

	var angle = vectorUtils.facingAngleDeg(
		this.gScene.globalCamera.babylon.camera.position ,
		this.babylon.mesh.position ,
		//this.direction
		this.facing
	) ;
	
	var sector = vectorUtils.degToSector[ this.engine.spriteAutoFacing ]( angle ) ;

	//console.warn( "@@@@@@@@@@ autoFacing() angle" , angle ) ;
	if ( this.clientMods.variant === sector ) { return ; }
	//console.warn( "@@@@@@@@@@ autoFacing() new sector" , sector ) ;

	this.clientMods.variant = sector ;
	this.clientMods.xFlipVariant = vectorUtils.xFlipSector[ sector ] ;
	this.updateTexture() ;
} ;

