import { Nullable } from "babylonjs/types";
import { serializeAsTexture, serialize, serializeAsColor3, SerializationHelper} from "babylonjs/Misc/decorators";
import { Color3, Matrix, Vector4, Vector3 } from "babylonjs/Maths/math";
import { IAnimatable } from "babylonjs/Misc/tools";
import { BaseTexture } from "babylonjs/Materials/Textures/baseTexture";
import { EffectFallbacks, EffectCreationOptions } from "babylonjs/Materials/effect";
import { MaterialDefines } from "babylonjs/Materials/materialDefines";
import { MaterialHelper } from "babylonjs/Materials/materialHelper";
import { PushMaterial } from "babylonjs/Materials/pushMaterial";
import { VertexBuffer } from "babylonjs/Meshes/buffer";
import { AbstractMesh } from "babylonjs/Meshes/abstractMesh";
import { SubMesh } from "babylonjs/Meshes/subMesh";
import { Mesh } from "babylonjs/Meshes/mesh";
import { Scene } from "babylonjs/scene";
import { _TypeStore } from 'babylonjs/Misc/typeStore';

import "./mxttest.fragment";
import "./mxttest.vertex";
import { Color } from 'csstype';

class MXTTestMaterialDefines extends MaterialDefines {
    public ALBEDO_MAP = false;
    public NORMAL_MAP = false;
    public OCCLUSION_MAP = false;
    public METALLIC_GLOSS_MAP = false;
    public EMISSION_MAP = false;
    public DETAIL_ALBEDO = false;
    public DETAIL_NORMAL = false;

    constructor() {
        super();
        this.rebuild();
    }
}

export class MXTTestMaterial extends PushMaterial {
    @serializeAsTexture("_MainTex")
    public mainTexture: BaseTexture;
    @serializeAsColor3("_Color")
    public color = new Color3(1, 1, 1);

    @serializeAsTexture("_OcclusionMap")
    public occlusionTexture: BaseTexture;
    @serialize("_OcclusionStrength")
    public occlusionStrength = 1.0;
    @serialize("_AOSecondTileset")
    public occlusionSecondTileset = 0.0;

    @serializeAsTexture("_BumpMap")
    public normalTexture: BaseTexture;
    @serialize("_BumpScale")
    public normalScale = 1.0;

    @serialize("_Metallic")
    public metallic = 1.0;
    @serialize("_Glossiness")
    public glossiness = 0.5;
    @serializeAsTexture("_MetallicGlossMap")
    public metallicGlossTexture: BaseTexture;
    @serialize("_MSecondTileset")
    public metallicSecondTileset = 0.0;

    @serializeAsTexture("_EmissionMap")
    public emissionTexture: BaseTexture;
    @serializeAsColor3("_EmissionColor")
    public emissionColor = new Color3(0,0,0);

    @serializeAsTexture("_DetailAlbedoMap")
    public detailAlbedoTexture: BaseTexture;
    @serializeAsTexture("_DetailNormalMap")
    public detailNormalTexture: BaseTexture;
    @serialize("_DetailAlpha")
    public detailAlpha = 0.0;
    @serialize("_DetailBumpScale")
    public detailBumpScale = 0.0;

    @serialize("_MainUVTransform")
    public mainUVTransform = new Vector4(1,1,0,0);
    @serialize("_DegtailUVTransform")
    public detailUVTransform = new Vector4(5,5,0,0);
    @serialize("_DetailUseUV2")
    public detailUseUV2 = 0.0;

    @serializeAsColor3("_Ambient_Sky")
    public ambientSkyColor = new Color3(0.75,0.75,0.75);
    @serializeAsColor3("_Ambient_Equator")
    public ambientEquatorColor = new Color3(0.897,0.897,0.897);
    @serializeAsColor3("_Ambient_Ground")
    public ambientGroundColor = new Color3(0.8,0.8,0.8);

    private _renderId: number;

    constructor(name: string, scene: Scene) {
        super(name, scene);
    }

    public needAlphaBlending(): boolean {
        return (this.alpha < 1.0);
    }

    public needAlphaBlendingForMesh(mesh: AbstractMesh): boolean {
        return this.needAlphaBlending() || (mesh.visibility < 1.0);
    }

    public needAlphaTesting(): boolean {
        return false;
    }

    public getAlphaTestTexture(): Nullable<BaseTexture> {
        return null;
    }

    // Methods
    public isReadyForSubMesh(mesh: AbstractMesh, subMesh: SubMesh, useInstances?: boolean): boolean {
        if (this.isFrozen) {
            if (this._wasPreviouslyReady && subMesh.effect) {
                return true;
            }
        }

        if (!subMesh._materialDefines) {
            subMesh._materialDefines = new MXTTestMaterialDefines();
        }

        var defines = <MXTTestMaterialDefines>subMesh._materialDefines;
        var scene = this.getScene();

        if (!this.checkReadyOnEveryCall && subMesh.effect) {
            if (this._renderId === scene.getRenderId()) {
                return true;
            }
        }

        var engine = scene.getEngine();

        // Textures
        if (defines._areTexturesDirty) {
            defines._needUVs = false;
            if (scene.texturesEnabled) {
                if (this.mainTexture) {
                    if (!this.mainTexture.isReady()) {
                        return false;
                    } else {
                        defines._needUVs = true;
                        defines.ALBEDO_MAP = true;
                    }
                }

                if (this.occlusionTexture) {
                    if (!this.occlusionTexture.isReady()) {
                        return false;
                    } else {
                        defines._needUVs = true;
                        defines.OCCLUSION_MAP = true;
                    }
                }

                if(this.metallicGlossTexture){
                    if(!this.metallicGlossTexture.isReady()){
                        return false;
                    }else {
                        defines._needUVs = true;
                        defines.METALLIC_GLOSS_MAP = true;
                    }
                }

                if (this.normalTexture) {
                    if (!this.normalTexture.isReady()) {
                        return false;
                    } else {
                        defines._needUVs = true;
                        defines.NORMAL_MAP = true;
                    }
                }

                if (this.emissionTexture) {
                    if (!this.emissionTexture.isReady()) {
                        return false;
                    } else {
                        defines._needUVs = true;
                        defines.EMISSION_MAP = true;
                    }
                }

                if (this.detailAlbedoTexture) {
                    if (!this.detailAlbedoTexture.isReady()) {
                        return false;
                    } else {
                        defines._needUVs = true;
                        defines.DETAIL_ALBEDO = true;
                    }
                }

                if (this.detailNormalTexture) {
                    if (!this.detailNormalTexture.isReady()) {
                        return false;
                    } else {
                        defines._needUVs = true;
                        defines.DETAIL_NORMAL = true;
                    }
                }
            }
        }

        // Get correct effect
        if (defines.isDirty) {
            defines.markAsProcessed();

            scene.resetCachedMaterial();

            //Attributes
            var attribs = [VertexBuffer.PositionKind];
            attribs.push(VertexBuffer.NormalKind);
            attribs.push(VertexBuffer.UVKind);

            ///
            if (defines.UV2) {
                attribs.push(VertexBuffer.UV2Kind);
            }

            var shaderName = "mxttest";
            var join = defines.toString();

            var uniforms = ["world", "u_view", "u_viewprojection", "u_tangentMatrix", "u_normalMatrix",
            "u_mainuvtransform", "u_detailuvtransform",
            "_Color", "_BumpScale", "_Metallic", "_Glossiness", "_EmissionColor", 
            "_OcclusionStrength", "_MSecondTileset", "_AOSecondTileset",
            "_Ambient_Sky", "_Ambient_Equator", "_Ambient_Ground",
            "u_lightColor", "u_lightDirection", "vEyePosition",
            "_DetailAlpha", "_DetailBumpScale", "u_detailuseuv2"
            ];
            var samplers = ["_MainTex", "_BumpMap", "_OcclusionMap", "_MetallicGlossMap", "_EmissionMap", "_DetailAlbedoMap", "_DetailNormalMap"];
            var uniformBuffers = new Array<string>();

            MaterialHelper.PrepareUniformsAndSamplersList(<EffectCreationOptions>{
                uniformsNames: uniforms,
                uniformBuffersNames: uniformBuffers,
                samplers: samplers,
                defines: defines,
                maxSimultaneousLights: 4
            });

            subMesh.setEffect(scene.getEngine().createEffect(shaderName,
                <EffectCreationOptions>{
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: 4 }
                }, engine), defines);
        }
        if (!subMesh.effect || !subMesh.effect.isReady()) {
            return false;
        }

        this._renderId = scene.getRenderId();
        this._wasPreviouslyReady = true;

        return true;
    }

    public bindForSubMesh(world: Matrix, mesh: Mesh, subMesh: SubMesh): void {
        var scene = this.getScene();

        var defines = <MXTTestMaterialDefines>subMesh._materialDefines;
        if (!defines) {
            return;
        }

        var effect = subMesh.effect;
        if (!effect) {
            return;
        }
        this._activeEffect = effect;

        MaterialHelper.BindEyePosition(this._activeEffect, scene);

        // Matrices
        this.bindOnlyWorldMatrix(world);
        this._activeEffect.setMatrix("u_viewprojection", scene.getTransformMatrix());
        
        var tangentMatrix = world.getRotationMatrix();
        var normalMatrix = Matrix.Transpose(tangentMatrix.invert());
        this._activeEffect.setMatrix("u_tangentMatrix", tangentMatrix);
        this._activeEffect.setMatrix("u_normalMatrix", normalMatrix);

        //UV Transforms
        this._activeEffect.setVector4("u_mainuvtransform", this.mainUVTransform);
        this._activeEffect.setVector4("u_detailuvtransform", this.detailUVTransform);

        if (this._mustRebind(scene, effect)) {
            // Textures
            if (this.mainTexture) {
                this._activeEffect.setTexture("_MainTex", this.mainTexture);
            }

            if (this.occlusionTexture) {
                this._activeEffect.setTexture("_OcclusionMap", this.occlusionTexture);
                this._activeEffect.setFloat("_OcclusionStrength", this.occlusionStrength);
                this._activeEffect.setFloat("_AOSecondTileset", this.occlusionSecondTileset);
            }

            if (this.normalTexture){
                this._activeEffect.setTexture("_BumpMap", this.normalTexture);
                this._activeEffect.setFloat("_BumpScale", this.normalScale);
            }

            if(this.metallicGlossTexture){
                this._activeEffect.setTexture("_MetallicGlossMap", this.metallicGlossTexture);
                this._activeEffect.setFloat("_MSecondTileset", this.metallicSecondTileset);
            }

            if(this.emissionTexture)
            {
                this._activeEffect.setTexture("_EmissionMap", this.emissionTexture);
            }

            if(this.detailAlbedoTexture)
            {
                this._activeEffect.setTexture("_DetailAlbedoMap", this.detailAlbedoTexture);
            }

            if(this.detailNormalTexture)
            {
                this._activeEffect.setTexture("_DetailNormalMap", this.detailNormalTexture);
            }

        }

        /// Material Colors
        this._activeEffect.setColor4("_Color", this.color, this.alpha * mesh.visibility);
        this._activeEffect.setColor3("_EmissionColor", this.emissionColor);

        /// Metallic Glossiness
        this._activeEffect.setFloat("_Metallic", this.metallic);
        this._activeEffect.setFloat("_Glossiness", this.glossiness);

        /// UV2 Utilities
        this._activeEffect.setFloat("u_detailuseuv2", this.detailUseUV2);
        this._activeEffect.setFloat("_DetailAlpha", this.detailAlpha);
        this._activeEffect.setFloat("_DetailBumpScale", this.detailBumpScale);

        /// Ambient/ Lighting
        this._activeEffect.setColor3("_Ambient_Sky", this.ambientSkyColor);
        this._activeEffect.setColor3("_Ambient_Equator", this.ambientEquatorColor);
        this._activeEffect.setColor3("_Ambient_Ground", this.ambientGroundColor);
        /// STRICTLY TEMPORARY LIGHTING PROPERTIES
        this._activeEffect.setColor3("u_lightColor", new Color3(0.95, 0.95, 0.95));
        this._activeEffect.setVector3("u_lightDirection", new Vector3(-0.39539, -0.95346, -0.48604));

        this._afterBind(mesh, this._activeEffect);
    }

    public getAnimatables(): IAnimatable[] {
        var results = [];

        if (this.mainTexture && this.mainTexture.animations && this.mainTexture.animations.length > 0) {
            results.push(this.mainTexture);
        }

        if (this.occlusionTexture && this.occlusionTexture.animations && this.occlusionTexture.animations.length > 0) {
            results.push(this.occlusionTexture);
        }

        if (this.normalTexture && this.normalTexture.animations && this.normalTexture.animations.length > 0) {
            results.push(this.normalTexture);
        }

        if (this.metallicGlossTexture && this.metallicGlossTexture.animations && this.metallicGlossTexture.animations.length > 0) {
            results.push(this.metallicGlossTexture);
        }

        if (this.emissionTexture && this.emissionTexture.animations && this.emissionTexture.animations.length > 0) {
            results.push(this.emissionTexture);
        }

        return results;
    }

    public getActiveTextures(): BaseTexture[] {
        var activeTextures = super.getActiveTextures();

        if (this.mainTexture) {
            activeTextures.push(this.mainTexture);
        }

        if(this.occlusionTexture){
            activeTextures.push(this.occlusionTexture);
        }

        if(this.normalTexture){
            activeTextures.push(this.normalTexture);
        }

        if(this.metallicGlossTexture){
            activeTextures.push(this.metallicGlossTexture);
        }

        if(this.emissionTexture){
            activeTextures.push(this.emissionTexture);
        }

        return activeTextures;
    }

    public hasTexture(texture: BaseTexture): boolean {
        if (super.hasTexture(texture)) {
            return true;
        }

        if (this.mainTexture === texture) {
            return true;
        }

        if (this.occlusionTexture === texture){
            return true;
        }

        if(this.normalTexture === texture){
            return true;
        }

        if(this.metallicGlossTexture === texture){
            return true;
        }

        if(this.emissionTexture === texture){
            return true;
        }

        return false;
    }

    public dispose(forceDisposeEffect?: boolean): void {
        if (this.mainTexture) {
            this.mainTexture.dispose();
        }
        
        if(this.occlusionTexture){
            this.occlusionTexture.dispose();
        }

        if(this.normalTexture){
            this.normalTexture.dispose();
        }

        if(this.metallicGlossTexture){
            this.metallicGlossTexture.dispose();
        }

        if(this.emissionTexture){
            this.emissionTexture.dispose();
        }

        super.dispose(forceDisposeEffect);
    }

    public clone(name: string): MXTTestMaterial {
        return SerializationHelper.Clone(() => new MXTTestMaterial(name, this.getScene()), this);
    }

    public serialize(): any {
        var serializationObject = SerializationHelper.Serialize(this);
        serializationObject.customType = "BABYLON.MXTTestMaterial";
        return serializationObject;
    }

    public getClassName(): string {
        return "MXTTestMaterial";
    }

    // Statics
    public static Parse(source: any, scene: Scene, rootUrl: string): MXTTestMaterial {
        return SerializationHelper.Parse(() => new MXTTestMaterial(source.name, scene), source, scene, rootUrl);
    }
}

_TypeStore.RegisteredTypes["BABYLON.MXTTestMaterial"] = MXTTestMaterial;