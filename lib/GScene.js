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



const Camera = require( './Camera.js' ) ;
const Message = require( './Message.js' ) ;
const Choices = require( './Choices.js' ) ;
const GTransition = require( './GTransition.js' ) ;

//const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const LeanEvents = require( 'nextgen-events/lib/LeanEvents.js' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE GScene! spellcast/lib/gfx/GScene.js
function GScene( dom , data ) {
	this.dom = dom ;    // Dom instance, immutable
	//this.id = data.id ;		// immutable
	this.engineId = data.engineId ;	// immutable
	//this.rightHanded = data.rightHanded !== undefined ? !! data.rightHanded : true ;    // immutable

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
	this.noLocalLightingGEntities = new Set() ;	// GEntities without local lighting
	this.localLightGEntities = new Set() ;	// GEntities that are local lights
	this.animationFunctions = new Set() ;	// Animations for things that are not supported by Babylonjs, like contrast/exposure animation

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
		diceRollerScene: null ,
		ui: null
	} ;

	this.initScene() ;
}

//GScene.prototype = Object.create( Ngev.prototype ) ;
GScene.prototype = Object.create( LeanEvents.prototype ) ;
GScene.prototype.constructor = GScene ;

module.exports = GScene ;



GScene.prototype.initScene = function() {
	// Instanciate Babylon engine
	var engine = this.babylon.engine = new BABYLON.Engine( this.$gscene , true ) ;

	// Create the scene space
	var scene = this.babylon.scene = new BABYLON.Scene( engine ) ;

	// Important, because by default the coordinate system is like DirectX (left-handed) not like math and OpenGL (right-handed)
	// /!\ THERE ARE BUGS WITH SPRITES AND RIGHT-HANDED SYSTEM /!\
	//scene.useRightHandedSystem = true ;

	// Optimizations
	scene.autoClear = false ;		// Don't clear the color buffer between frame (skybox expected!)
	scene.autoClearDepthAndStencil = false ;	// Same with depth and stencil buffer

	// Don't clear Depth and Stencil for rendering group 1 which is used for game scene (not GUI),
	// specifically for Particle System wich caused trouble with alpha-blended GEntityShadow.
	scene.setRenderingAutoClearDepthStencil( 1 , false ) ;

	// Add a camera to the scene and attach it to the canvas
	this.globalCamera = new Camera( this ) ;

	// Register a render loop to repeatedly render the scene
	engine.runRenderLoop( () => {
		var gEntity , fn ,
			t = Date.now() / 1000 ;

		if ( this.parametricGEntities.size ) {
			for ( gEntity of this.parametricGEntities ) {
				gEntity.parametricUpdate( t ) ;
			}
		}

		if ( this.animationFunctions.size ) {
			// Note that the fn *IS RESPONSIBLE* for auto-deleting itself from this.animationFunctions once the job is finished
			for ( fn of this.animationFunctions ) { fn( t ) ; }
		}

		//this.emitIfListener( 'render' , this.changes ) ;	// <-- Ngev
		this.emit( 'render' , this.changes ) ;	// <-- LeanEvents
		this.changes.camera = false ;

		scene.render() ;
		if ( this.babylon.diceRollerScene ) { this.babylon.diceRollerScene.render() ; }
	} ) ;

	//setTimeout( () => new BABYLON.ParticleHelper.CreateAsync( "fire" , scene ).then( pSet => pSet.start() ) , 3000 ) ;

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

		// Post-processing, see:
		// https://doc.babylonjs.com/divingDeeper/postProcesses/usePostProcesses
		if ( typeof data.special.contrast === 'number' ) { this.updateContrast( data ) ; }
		if ( typeof data.special.exposure === 'number' ) { this.updateExposure( data ) ; }
		if ( data.special.colorGrading ) { this.updateColorGrading( data ) ; }
		if ( data.special.colorCurves ) { this.updateColorCurves( data ) ; }
		if ( data.special.vignette ) { this.updateVignette( data ) ; }
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

	if ( ! this.special.ambient ) { this.special.ambient = new BABYLON.Color3( 0 , 0 , 0 ) ; }
	Object.assign( this.special.ambient , data.special.ambient ) ;

	if ( data.transition ) {
		data.transition.createAnimation(
			scene ,
			scene ,
			'ambientColor' ,
			BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
			new BABYLON.Color3( this.special.ambient.r , this.special.ambient.g , this.special.ambient.b )
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

	if ( data.transition ) {
		data.transition.createAnimationFn(
			this ,
			scene.imageProcessingConfiguration ,
			'contrast' ,
			BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
			this.special.contrast
		) ;
	}
	else {
		scene.imageProcessingConfiguration.contrast = this.special.contrast ;
	}
} ;



GScene.prototype.updateExposure = function( data ) {
	console.warn( ".updateExposure()" , this.special.exposure ) ;
	var scene = this.babylon.scene ;

	this.special.exposure = data.special.exposure ;

	if ( data.transition ) {
		data.transition.createAnimationFn(
			this ,
			scene.imageProcessingConfiguration ,
			'exposure' ,
			BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
			this.special.exposure
		) ;
	}
	else {
		scene.imageProcessingConfiguration.exposure = this.special.exposure ;
	}
} ;



const CURVE_PROPERTIES = new Set( [
	'globalHue' , 'globalDensity' , 'globalSaturation' ,
	'highlightsHue' , 'highlightsDensity' , 'highlightsSaturation' ,
	'shadowsHue' , 'shadowsDensity' , 'shadowsSaturation'
] ) ;

GScene.prototype.updateColorCurves = function( data ) {
	console.warn( ".updateColorCurves()" , this.special.colorCurves ) ;
	var key ,
		colorCurves = data.special.colorCurves ,
		scene = this.babylon.scene ;

	if ( ! colorCurves ) {
		if ( this.special.colorCurves ) { this.special.colorCurves = null ; }
		scene.imageProcessingConfiguration.colorCurvesEnabled = false ;
		return ;
	}

	if ( typeof colorCurves !== 'object' ) { return ; }

	scene.imageProcessingConfiguration.colorCurvesEnabled = true ;
	if ( ! this.special.colorCurves ) { this.special.colorCurves = {} ; }
	if ( ! scene.imageProcessingConfiguration.colorCurves ) {
		scene.imageProcessingConfiguration.colorCurves = {
			globalHue: 0 ,
			globalDensity: 0 ,
			globalSaturation: 0 ,
			highlightsHue: 0 ,
			highlightsDensity: 0 ,
			highlightsSaturation: 0 ,
			shadowsHue: 0 ,
			shadowsDensity: 0 ,
			shadowsSaturation: 0
		} ;
	}

	for ( key in colorCurves ) {
		if ( ! CURVE_PROPERTIES.has( key ) && typeof colorCurves[ key ] !== 'number' ) { continue ; }
		this.special.colorCurves[ key ] = colorCurves[ key ] ;

		if ( data.transition ) {
			data.transition.createAnimationFn(
				this ,
				scene.imageProcessingConfiguration.colorCurves ,
				key ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.colorCurves[ key ]
			) ;
		}
		else {
			scene.imageProcessingConfiguration.colorCurves[ key ] = this.special.colorCurves[ key ] ;
		}
	}
} ;



const VIGNETTE_FLOAT_PROPERTIES = {
	stretch: 'vignetteStretch' ,
	centerX: 'vignetteCentreX' ,
	centerY: 'vignetteCentreY' ,
	weight: 'vignetteWeight'
	//, color: 'vignetteColor'
	//, blendMode: 'vignetteBlendMode'
} ;

GScene.prototype.updateVignette = function( data ) {
	console.warn( ".updateVignette()" , this.special.vignette ) ;
	var key , targetKey ,
		vignette = data.special.vignette ,
		scene = this.babylon.scene ;

	if ( ! vignette ) {
		if ( this.special.vignette ) { this.special.vignette = null ; }
		scene.imageProcessingConfiguration.vignetteEnabled = false ;
		return ;
	}

	if ( typeof vignette !== 'object' ) { return ; }

	scene.imageProcessingConfiguration.vignetteEnabled = true ;
	if ( ! this.special.vignette ) { this.special.vignette = {} ; }
	if ( ! scene.imageProcessingConfiguration.vignette ) {
		/*
		scene.imageProcessingConfiguration.vignetteStretch = 0 ;
		scene.imageProcessingConfiguration.vignetteCentreX = 0 ;
		scene.imageProcessingConfiguration.vignetteCentreY = 0 ;
		scene.imageProcessingConfiguration.vignetteWeight = 1.5 ;
		scene.imageProcessingConfiguration.vignetteColor = new BABYLON.Color4( 1 , 1 , 1 , 0.5 ) ;
		scene.imageProcessingConfiguration.vignetteBlendMode = BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY ;
		*/
	}

	for ( key in vignette ) {
		targetKey = VIGNETTE_FLOAT_PROPERTIES[ key ] ;
		if ( ! targetKey ) { continue ; }
		this.special.vignette[ key ] = vignette[ key ] ;

		if ( data.transition ) {
			data.transition.createAnimationFn(
				this ,
				scene.imageProcessingConfiguration ,
				targetKey ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.vignette[ key ]
			) ;
		}
		else {
			scene.imageProcessingConfiguration[ targetKey ] = this.special.vignette[ key ] ;
		}
	}

	if ( vignette.color ) {
		this.special.vignette.color = vignette.color ;

		if ( data.transition ) {
			data.transition.createAnimationFn(
				this ,
				scene.imageProcessingConfiguration ,
				'vignetteColor' ,
				BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
				new BABYLON.Color3( vignette.color.r , vignette.color.g , vignette.color.b )
			) ;
		}
		else {
			scene.imageProcessingConfiguration.vignetteColor.set( vignette.color.r , vignette.color.g , vignette.color.b ) ;
		}
	}

	if ( vignette.blendMode ) {
		switch ( vignette.blendMode ) {
			case 'multiply' :
				this.special.vignette.blendMode = 0 ;	//BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY ;
				break ;

			case 'opaque' :
			default :
				this.special.vignette.blendMode = 1 ;	//BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_OPAQUE ;
				break ;
		}

		scene.imageProcessingConfiguration.vignetteBlendMode = this.special.vignette.blendMode ;
	}
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

		colorGradingTexture = new BABYLON.Texture( this.special.colorGrading.url , scene , true , false ) ;
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

			colorGradingTexture = new BABYLON.Texture( this.special.colorGrading.url , scene , true , false ) ;
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
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.colorGrading.level ,
				oldLevel
			) ;
		}
		else {
			colorGradingTexture.level = this.special.colorGrading.level ;
		}
	}
} ;



GScene.prototype.updateLightExcludedMeshes = function() {
	var light ,
		excludedMeshes = [ ... this.noLocalLightingGEntities ].map( e => e.babylon.mesh ) ;

	for ( light of this.localLightGEntities ) {
		light.babylon.light.excludedMeshes = excludedMeshes ;
	}
} ;



GScene.prototype.hasGEntity = function( gEntityId ) { return gEntityId in this.gEntities ; } ;
GScene.prototype.getGEntity = function( gEntityId ) { return this.gEntities[ gEntityId ] ; } ;



GScene.prototype.registerGEntity = function( gEntityId , gEntity ) {
	if ( this.gEntities[ gEntityId ] ) { throw new Error( "Entity '" + gEntityId + "' already exists for this gScene" ) ; }
	this.gEntities[ gEntityId ] = gEntity ;
} ;



GScene.prototype.unregisterGEntity = function( gEntityId ) {
	delete this.gEntities[ gEntityId ] ;
} ;



GScene.prototype.removeGEntity = function( gEntityId ) {
	var gEntity = this.gEntities[ gEntityId ] ;
	if ( ! gEntity ) { return false ; }
	gEntity.destroy() ;
	return true ;
} ;



GScene.prototype.getUi = function() {
	if ( this.babylon.ui ) { return this.babylon.ui ; }
	this.babylon.ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI( 'ui' ) ;
	return this.babylon.ui ;
} ;



// Event catching/dispatching
// The function names are forced, and it require in the KFG on GScene creation the 'catch' property:
// catch: { message: boolean, choices: boolean, ... }

// For message
GScene.prototype.addMessage = function( text , options ) {
	var message = new Message( this.dom , this , text , options ) ;
	return message.run() ;
} ;



// For choices (nextList)
GScene.prototype.setChoices = function( choices , undecidedNames , onSelect , options ) {
	var choices = new Choices( this.dom , this , choices , undecidedNames , onSelect , options ) ;
	return choices.run() ;
} ;

