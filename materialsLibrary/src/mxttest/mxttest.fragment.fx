#version 300 es

#extension GL_EXT_shader_texture_lod: enable
#extension GL_OES_standard_derivatives : enable

precision highp float;

in vec3 v_position;
in vec4 v_uv;
in vec3 v_normal;
in vec3 v_tangentuws;
in vec3 v_tangentvws;

out vec4 FragColor;

// Uniforms properties
// Albedo/Diffuse
uniform vec4 _Color;
#ifdef ALBEDO_MAP
uniform sampler2D _MainTex;
#endif
// Ambient Occlusion
#ifdef OCCLUSION_MAP
uniform sampler2D _OcclusionMap;
uniform float _OcclusionStrength;
uniform float _AOSecondTileset;
#endif
// Metallic Glossiness
uniform float _Metallic;
uniform float _Glossiness;
#ifdef METALLIC_GLOSS_MAP
uniform sampler2D _MetallicGlossMap;
uniform float _MSecondTileset;
#endif
// Base Normals
#ifdef NORMAL_MAP
uniform sampler2D _BumpMap;
#endif
uniform float _BumpScale;
// Emission
#ifdef EMISSION_MAP
uniform sampler2D _EmissionMap;
#endif
uniform vec3 _EmissionColor;
// Detail Albedo
#ifdef DETAIL_ALBEDO
uniform sampler2D _DetailAlbedoMap;
#endif
// Detail Normal
#ifdef DETAIL_NORMAL
uniform sampler2D _DetailNormalMap;
#endif
// Detail Utility
uniform float _DetailAlpha;
uniform float _DetailBumpScale;

/// Ambient Colors
uniform vec3 _Ambient_Sky;
uniform vec3 _Ambient_Equator;
uniform vec3 _Ambient_Ground;

/// Light properties
uniform vec3 u_lightColor;
uniform vec3 u_lightDirection;

/// Utility uniforms
uniform vec3 vEyePosition;

/// Shader uniform constants
const vec4 dielectricSpec = vec4(0.04, 0.04, 0.04, 1.0 - 0.04);
const vec4 colorSpaceDouble = vec4(4.59479380, 4.59479380, 4.59479380, 2.0);

vec4 GammaToLinearSpace (vec4 sRGB)
{
    return vec4(sRGB.rgb * (sRGB.rgb * (sRGB.rgb * 0.305306011 + 0.682171111) + 0.012522878), sRGB.a);
}

vec3 LinearToGammaSpace (vec3 linRGB)
{
    linRGB = max(linRGB, vec3(0.0, 0.0, 0.0));
    // An almost-perfect approximation from http://chilliant.blogspot.com.au/2012/08/srgb-approximations-for-hlsl.html?m=1
    return max(1.055 * pow(linRGB, vec3(0.416666667, 0.416666667, 0.416666667)) - 0.055, 0.0);
}

vec3 LerpWhiteTo(vec3 b, float t)
{
    return vec3(1.0, 1.0, 1.0) + t * (b - vec3(1.0, 1.0, 1.0));
}

vec3 UnpackScaleNormalRGorAG(vec4 packedNormal, float bumpScale)
{
    packedNormal.x *= packedNormal.w;

    vec3 normal;
    normal.xy = packedNormal.xy * 2.0 - 1.0;
    normal.xy *= bumpScale;
    normal.z = sqrt(1.0 - clamp(dot(normal.xy, normal.xy), 0.0, 1.0));

    return normal;
}

vec3 Vec3TsToWsNormalized( vec3 vVectorTs, vec3 vNormalWs, vec3 vTangentUWs, vec3 vTangentVWs )
{
	return (normalize(
		//start by mul the horizontal channel of the normal sample with the tangent of the vertex.
		vVectorTs.x * vTangentUWs.xyz
		//mul the vertical channel of the normal sample with the binormal of the vertex.
		+vVectorTs.y * vTangentVWs.xyz
		//mul the depth channel of the normal sample with the normal of the vertex.
		+vVectorTs.z * vNormalWs.xyz
	));
}

float OneMinusReflectivityFromMetallic(float metallic)
{
	return dielectricSpec.a - metallic * dielectricSpec.a;
}

vec3 SpecularFromMetallic (vec3 albedo, float metallic)
{
	return mix (dielectricSpec.rgb, albedo, metallic);
}

vec3 BRDF1_Unity_PBS (vec3 specColor, float roughness, float realRoughness, vec3 normal, vec3 _halfv, float ldoth, float ndotl)
{
	float nh = dot(normal, _halfv);
	roughness = max(roughness, 0.01);

	float a = roughness * roughness;
	float a2 = a * a;
    float d = nh * nh * (a2 - 1.0) + 1.00001;

	float specularTerm = a2 / (max(0.1, ldoth*ldoth) * (roughness + 0.5) * (d * d) * 4.0);

	specularTerm = specularTerm - 1e-4;
	specularTerm = clamp(specularTerm, 0.0, 100.0); //Prevent FP16 overflow on mobiles

	return specularTerm * specColor * u_lightColor * ndotl * 1.0; //light.atten;
}

void main(void) {

    vec2 uv = v_uv.xy;
    vec2 detailUV = v_uv.zw;

	/// Setup Albedo and Alpha
#ifdef ALBEDO_MAP
	vec4 albedo = GammaToLinearSpace(texture(_MainTex, uv)) * (_Color);
#else
    vec4 albedo = _Color;
#endif
    float alpha = albedo.a;

/// MISSING ALPHA TEST

    /// Setup Detail Albedo
#ifdef DETAIL_ALBEDO
    vec4 detailSample = GammaToLinearSpace(texture(_DetailAlbedoMap, detailUV));
#ifdef DETAILBLEND_MULTIPLY
	albedo.rgb *= detailSample.rgb; /// Make sure to change to detail UV
#else
	albedo.rgb *= LerpWhiteTo(detailSample.rgb * colorSpaceDouble.rgb, detailSample.a);
#endif

	alpha = mix(alpha, detailSample.a, _DetailAlpha);
#endif

#ifdef METALLIC_GLOSS_MAP
    vec2 mUV = mix(uv, detailUV, _MSecondTileset);
    vec4 metallicTexel = texture(_MetallicGlossMap, mUV);
    float metallic = metallicTexel.r * _Metallic;
    float roughness = 1.0 - (metallicTexel.a * _Glossiness);
#else
    float metallic = _Metallic;
    float roughness = 1.0 - _Glossiness;
#endif
    float realRoughness = roughness * roughness;

    /// Setup Specular and OneMinusReflectivity
    float oneMinusReflectivity = OneMinusReflectivityFromMetallic(metallic);
    vec3 specColor = SpecularFromMetallic(albedo.rgb, metallic);
    albedo *= oneMinusReflectivity;

    /// Setup Normals
    vec3 normalWS = v_normal;
    float _bumpScale;
#ifdef NORMAL_MAP
    _bumpScale = _DetailBumpScale == 1.0 ? 1.0 : _BumpScale;
    vec3 normalTS = UnpackScaleNormalRGorAG(texture(_BumpMap, uv), _bumpScale);
#else
    vec3 normalTS = vec3(0.0,0.0,1.0);
#endif

#ifdef DETAIL_NORMAL
    _bumpScale = _DetailBumpScale == 1.0 ? _BumpScale : 1.0;
    vec3 detailNormal = UnpackScaleNormalRGorAG(texture(_DetailNormalMap, detailUV), _BumpScale);
    normalTS = normalize(vec3(normalTS.xy + detailNormal.xy, normalTS.z * detailNormal.z));
#endif
    normalWS = Vec3TsToWsNormalized(normalTS, normalWS, v_tangentuws, v_tangentvws);

    /// Setup Occlusion
#ifdef OCCLUSION_MAP
    vec2 oUV = mix(uv, detailUV, _AOSecondTileset);
    float occlusion = mix(1.0, texture(_OcclusionMap, oUV).r, _OcclusionStrength);
#else
    float occlusion = 1.0;
#endif

    /// Setup Lighting specific vectors
    vec3 lightDir = -normalize(u_lightDirection);
    vec3 viewDir = normalize(vEyePosition - v_position);
    float ndotv = clamp(dot(normalWS, viewDir), 0.0, 1.0);
    float ndotl = max(0.0, dot(normalWS, lightDir));
    vec3 _halfv = normalize(lightDir + viewDir);
    float ldoth = max(0.0, dot(lightDir, _halfv));

    /// Calculate Diffuse and specular terms
    vec3 diffuseTerm = ndotl * u_lightColor;
    vec3 specTerm = BRDF1_Unity_PBS(specColor, roughness, realRoughness, normalWS, _halfv, ldoth, ndotl) * occlusion;

    /// Setup Emission
#ifdef EMISSION_MAP
    vec3 emission = (GammaToLinearSpace(texture(_EmissionMap, uv)).rgb * _EmissionColor).rgb;
#else
    vec3 emission = _EmissionColor.rgb;
#endif

/// MISSING PREMULTIPLY ALPHA

	vec3 amCol = mix(_Ambient_Equator, _Ambient_Sky, clamp(dot(vec3(0.0,1.0,0.0), normalWS), 0.0, 1.0));
    albedo.rgb *= (mix(amCol, _Ambient_Ground , clamp(dot(vec3(0.0,-1.0,0.0), normalWS), 0.0, 1.0)) + diffuseTerm) * occlusion;

/// MISSING REFLECTIONS

/// MISSING PROPER BLENDING
	FragColor = vec4(clamp(LinearToGammaSpace(
		albedo.rgb
		+ specTerm
		+ emission
		/*+ indirect*/), vec3(0.0,0.0,0.0), vec3(1.0,1.0,1.0)), 1.0);//baseColor;
}