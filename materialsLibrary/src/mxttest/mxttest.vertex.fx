#version 300 es
precision highp float;

// Attributes
in vec3 position;
in vec3 normal;
in vec4 tangent;
in vec2 uv;
in vec2 uv2;

// Uniforms
#include<instancesDeclaration>
uniform mat4 u_viewprojection;
uniform vec4 u_mainuvtransform;
uniform vec4 u_detailuvtransform;
uniform mat4 u_tangentMatrix;
uniform mat4 u_normalMatrix;
uniform float u_detailuseuv2;

out vec3 v_position;
out vec4 v_uv;
out vec3 v_normal;
out vec3 v_tangentuws;
out vec3 v_tangentvws;

void main(void) 
{

#include<instancesVertex>

	gl_Position = u_viewprojection * finalWorld * vec4(position, 1.0);

	vec4 worldPos = finalWorld * vec4(position, 1.0);
	v_position = vec3(worldPos);

	v_normal = normalize((mat3(u_normalMatrix) * normal).xyz);

	//#ifdef NORMAL_MAP// || defined(def DETAIL_NORMAL)
	v_tangentuws = normalize(u_tangentMatrix * vec4(tangent.xyz,0.0)).xyz;
	v_tangentvws = cross(v_normal, v_tangentuws) * -tangent.w;
	//#endif

	/// WILL NEED TO VERIFY IF Y-COORDINATE NEEDS TO BE FLIPPED
	vec2 tempUV = vec2(uv.x, 1.0 - uv.y);
	vec2 tempUV2 = vec2(uv2.x, 1.0 - uv2.y);
	v_uv.xy = tempUV * u_mainuvtransform.xy + u_mainuvtransform.zw;
	v_uv.zw = mix(tempUV, tempUV2, u_detailuseuv2) * u_detailuvtransform.xy + u_detailuvtransform.zw;
}
