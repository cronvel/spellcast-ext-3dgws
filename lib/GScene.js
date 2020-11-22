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
const Camera = require( './Camera.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE GScene! spellcast/lib/gfx/GScene.js
function GScene( dom , data ) {
	this.dom = dom ;    // Dom instance, immutable
	//this.id = data.id ;		// immutable
	this.engineId = data.engineId ;	// immutable
	this.rightHanded = data.rightHanded !== undefined ? !! data.rightHanded : true ;    // immutable

	this.active = false ;
	this.paused = false ;
	this.persistent = false ;
	this.theme = 'default' ;
	this.special = {} ;
	this.engine = {} ;
	this.texturePacks = {} ;
	this.gEntityLocations = {} ;
	this.gEntities = {} ;	// GEntities by name
	this.parametricGEntities = new Set() ;	// Only GEntities having parametric animation
	this.fallbackTransitions = new Set() ;	// GTransition for things that are not animatable in Babylon

	this.globalCamera = null ;
	this.roleCamera = null ;	// For multiplayer, not implemented yet

	this.$gscene = document.createElement( 'canvas' ) ;
	// At creation, the visibility is turned off, the initial update will turn it on again
	this.$gscene.classList.add( 'gscene' ) ;
	this.$gscene.style.visibility = 'hidden' ;
	this.dom.$gfx.append( this.$gscene ) ;

	this.resizeObserver = null ;	// used to detect when the canvas element is resized

	// What have changed before the last rendered scene
	this.changes = {
		camera: false
	} ;

	// Babylon stuffs
	this.babylon = {
		engine: null ,
		scene: null ,
		ui: null
	} ;
	
	this.initScene() ;
}

GScene.prototype = Object.create( Ngev.prototype ) ;
GScene.prototype.constructor = GScene ;

module.exports = GScene ;



GScene.prototype.initScene = function() {
	// Instanciate Babylon engine
	var engine = this.babylon.engine = new Babylon.Engine( this.$gscene , true ) ;

	// Create the scene space
	var scene = this.babylon.scene = new Babylon.Scene( engine ) ;

	// Important, because by default the coordinate system is like DirectX (left-handed) not like math and OpenGL (right-handed)
	// /!\ THERE ARE BUGS WITH SPRITES AND RIGHT-HANDED SYSTEM /!\
	//scene.useRightHandedSystem = true ;

	// Optimizations
	scene.autoClear = false ;		// Don't clear the color buffer between frame (skybox expected!)
	scene.autoClearDepthAndStencil = false ;	// Same with depth and stencil buffer

	// Add a camera to the scene and attach it to the canvas
	this.globalCamera = new Camera( this ) ;

	// Register a render loop to repeatedly render the scene
	engine.runRenderLoop( () => {
		if ( this.parametricGEntities.size ) {
			let t = Date.now() / 1000 ;
			for ( let gEntity of this.parametricGEntities ) {
				gEntity.parametricUpdate( t ) ;
			}
		}

		if ( this.fallbackTransitions.size ) {
			for ( let transition of this.fallbackTransitions ) {
				transition.nextStep() ;
			}
		}

		this.emitIfListener( 'render' , this.changes ) ;
		this.changes.camera = false ;
		
		scene.render() ;
	} ) ;
	
	// ResizeObserver is used to detect when the canvas element is resized, to avoid image streching
	this.resizeObserver = new ResizeObserver( () => engine.resize() ) ;
	this.resizeObserver.observe( this.$gscene ) ;
} ;



// !THIS SHOULD TRACK SERVER-SIDE GScene! spellcast/lib/gfx/GScene.js
GScene.prototype.update = function( data , awaiting = false , initial = false ) {
	console.warn( "3D GScene.update()" , data ) ;
	var key ;

	if ( data.transition ) {
		if ( initial ) { delete data.transition ; }
		else { data.transition = new GTransition( data.transition ) ; }
	}

	if ( data.active !== undefined ) {
		this.active = !! data.active ;
		this.$gscene.style.visibility = this.active ? 'visible' : 'hidden' ;
	}

	if ( data.paused !== undefined ) { this.paused = !! data.paused ; }
	if ( data.persistent !== undefined ) { this.persistent = !! data.persistent ; }
	//if ( data.roles !== undefined ) { this.roles = data.roles ; }
	if ( data.theme !== undefined ) { this.theme = data.theme || 'default' ; }

	if ( data.special && typeof data.special === 'object' ) {
		if ( data.special.ambient ) { this.updateAmbient( data ) ; }
		if ( typeof data.special.contrast === 'number' ) { this.updateContrast( data ) ; }
		if ( typeof data.special.exposure === 'number' ) { this.updateExposure( data ) ; }
		if ( data.special.colorGrading ) { this.updateColorGrading( data ) ; }
	}

	if ( data.engine && typeof data.engine === 'object' ) {
		Object.assign( this.engine , data.engine ) ;
	}

	if ( data.globalCamera !== undefined ) { this.globalCamera.update( data.globalCamera ) ; }

	return ( awaiting && data.transition && data.transition.promise ) || Promise.resolved ;
} ;



GScene.prototype.updateAmbient = function( data ) {
	console.warn( ".updateAmbient()" , this.special.ambient ) ;
	var scene = this.babylon.scene ;

	if ( ! data.special.ambient || typeof data.special.ambient !== 'object' ) { return ; }

	if ( ! this.special.ambient ) { this.special.ambient = new Babylon.Color3( 0 , 0 , 0 ) ; }
	Object.assign( this.special.ambient , data.special.ambient ) ;

	if ( data.transition ) {
		data.transition.createAnimation(
			scene ,
			scene ,
			'ambientColor' ,
			Babylon.Animation.ANIMATIONTYPE_COLOR3 ,
			new Babylon.Color3( this.special.ambient.r , this.special.ambient.g , this.special.ambient.b )
		) ;
	}
	else {
		scene.ambientColor.set( this.special.ambient.r , this.special.ambient.g , this.special.ambient.b ) ;
	}
} ;



GScene.prototype.updateContrast = function( data ) {
	console.warn( ".updateContrast()" , this.special.contrast ) ;
	var scene = this.babylon.scene ;

	this.special.contrast = data.special.contrast ;

	scene.imageProcessingConfiguration.contrast = this.special.contrast ;

	// Animation doesn't work ATM, scene.imageProcessingConfiguration is not animatable,
	// so it will need some house-code to handle this type of thing (could work like parametric animation)
	/*
	if ( data.transition ) {
		data.transition.createAnimation(
			scene ,
			scene.imageProcessingConfiguration ,
			'contrast' ,
			Babylon.Animation.ANIMATIONTYPE_FLOAT ,
			this.special.contrast
		) ;
	}
	else {
		scene.imageProcessingConfiguration.contrast = this.special.contrast ;
	}
	//*/
} ;



GScene.prototype.updateExposure = function( data ) {
	console.warn( ".updateExposure()" , this.special.exposure ) ;
	var scene = this.babylon.scene ;

	this.special.exposure = data.special.exposure ;

	scene.imageProcessingConfiguration.exposure = this.special.exposure ;

	// Animation doesn't work ATM, scene.imageProcessingConfiguration is not animatable,
	// so it will need some house-code to handle this type of thing (could work like parametric animation)
	/*
	if ( data.transition ) {
		data.transition.createAnimation(
			scene ,
			scene.imageProcessingConfiguration ,
			'exposure' ,
			Babylon.Animation.ANIMATIONTYPE_FLOAT ,
			this.special.exposure
		) ;
	}
	else {
		scene.imageProcessingConfiguration.exposure = this.special.exposure ;
	}
	//*/
} ;



GScene.prototype.updateColorGrading = function( data ) {
	console.warn( ".updateColorGrading()" , this.special.colorGrading ) ;
	var scene = this.babylon.scene ,
		colorGrading = data.special.colorGrading ,
		url , oldLevel , setLevel = false ,
		colorGradingTexture ;

	if ( ! colorGrading ) {
		if ( this.special.colorGrading ) {
			this.special.colorGrading = null ;
		}

		scene.imageProcessingConfiguration.colorGradingEnabled = false ;
		if ( scene.imageProcessingConfiguration.colorGradingTexture ) {
			scene.imageProcessingConfiguration.colorGradingTexture.dispose() ;
		}

		return ;
	}

	if ( typeof colorGrading !== 'object' ) { return ; }

	if ( colorGrading.url && typeof colorGrading.url === 'string' ) { url = this.dom.cleanUrl( colorGrading.url ) ; }

	if ( ! this.special.colorGrading ) {
		// URL is mandatory if there is nothing yet
		if ( ! url ) { return ; }

		this.special.colorGrading = {
			url ,
			level: typeof colorGrading.level === 'number' ? colorGrading.level : 1 
		} ;

		colorGradingTexture = new Babylon.Texture( this.special.colorGrading.url , scene , true , false ) ;
		colorGradingTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE ;
		colorGradingTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

		scene.imageProcessingConfiguration.colorGradingEnabled = true ;
		scene.imageProcessingConfiguration.colorGradingTexture = colorGradingTexture ;
		scene.imageProcessingConfiguration.colorGradingWithGreenDepth = false ;
		oldLevel = 0 ;
		setLevel = true ;
	}
	else {
		if ( url && url !== this.special.colorGrading.url ) {
			this.special.colorGrading.url = url ;

			colorGradingTexture = new Babylon.Texture( this.special.colorGrading.url , scene , true , false ) ;
			colorGradingTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE ;
			colorGradingTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

			scene.imageProcessingConfiguration.colorGradingTexture = colorGradingTexture ;
		}
		else {
			colorGradingTexture = scene.imageProcessingConfiguration.colorGradingTexture ;
		}

		if ( typeof colorGrading.level === 'number' ) {
			oldLevel = this.special.colorGrading.level ;
			setLevel = true ;
			this.special.colorGrading.level = colorGrading.level ;
		}
	}

	if ( setLevel ) {
		console.warn( "level" , oldLevel , this.special.colorGrading.level , data.transition ) ;
		if ( data.transition ) {
			// Animation using easing

			data.transition.createAnimation(
				scene ,
				colorGradingTexture ,
				'level' ,
				Babylon.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.colorGrading.level ,
				oldLevel
			) ;
		}
		else {
			colorGradingTexture.level = this.special.colorGrading.level ;
		}
	}
} ;



GScene.prototype.hasGEntity = function( gEntityId ) { return gEntityId in this.gEntities ; } ;
GScene.prototype.getGEntity = function( gEntityId ) { return this.gEntities[ gEntityId ] ; } ;
GScene.prototype.addGEntity = function( gEntityId , gEntity ) { this.gEntities[ gEntityId ] = gEntity ; } ;

GScene.prototype.removeGEntity = function( gEntityId ) {
	var gEntity = this.gEntities[ gEntityId ] ;
	if ( ! gEntity ) { return false ; }

	delete this.gEntities[ gEntityId ] ;
	return true ;
} ;

