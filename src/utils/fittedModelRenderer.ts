import * as THREE from 'three';
import { FittedAccessoryItem, FittedAccessoryOffset } from '../types/fittedAccessories';

/**
 * Creates a Three.js Object3D from a FittedAccessoryItem and positions/rotates/scales it relative to the target body bone group.
 */
export function buildFittedAccessoryObject(item: FittedAccessoryItem): THREE.Object3D {
  const container = new THREE.Group();
  container.name = `fitted_acc_${item.id}_${item.name}`;

  if (item.meshType === 'studio_parts' && item.parts && item.parts.length > 0) {
    // Build multi-part composite assembly
    item.parts.forEach((part) => {
      let geom: THREE.BufferGeometry;
      switch (part.shape) {
        case 'cylinder':
          geom = new THREE.CylinderGeometry(part.size[0] / 2, part.size[0] / 2, part.size[1], 16);
          break;
        case 'sphere':
          geom = new THREE.SphereGeometry(part.size[0] / 2, 16, 16);
          break;
        case 'wedge':
          geom = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
          break;
        default:
          geom = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
          break;
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(part.color || item.color || '#3b82f6'),
        roughness: String(part.material).toLowerCase() === 'glass' ? 0.1 : 0.5,
        metalness: String(part.material).toLowerCase() === 'metal' ? 0.8 : 0.1,
        transparent: (part.transparency || 0) > 0,
        opacity: 1 - (part.transparency || 0),
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(part.position[0], part.position[1], part.position[2]);
      mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      container.add(mesh);
    });
  } else if (item.meshType === 'obj' && item.objText) {
    // Simple OBJ text parser or box fallback
    try {
      const positions: number[] = [];
      const normals: number[] = [];
      const indices: number[] = [];

      const lines = item.objText.split('\n');
      const tempVerts: number[][] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) {
          const parts = trimmed.split(/\s+/).slice(1).map(Number);
          if (parts.length >= 3) tempVerts.push(parts);
        } else if (trimmed.startsWith('f ')) {
          const faceParts = trimmed.split(/\s+/).slice(1);
          const vertexIndices = faceParts.map((p) => {
            const idx = p.split('/')[0];
            return parseInt(idx, 10) - 1;
          });
          if (vertexIndices.length >= 3) {
            indices.push(vertexIndices[0], vertexIndices[1], vertexIndices[2]);
            if (vertexIndices.length === 4) {
              indices.push(vertexIndices[0], vertexIndices[2], vertexIndices[3]);
            }
          }
        }
      }

      if (tempVerts.length > 0 && indices.length > 0) {
        const geom = new THREE.BufferGeometry();
        const flatPos: number[] = [];
        tempVerts.forEach((v) => flatPos.push(v[0], v[1], v[2]));
        geom.setAttribute('position', new THREE.Float32BufferAttribute(flatPos, 3));
        geom.setIndex(indices);
        geom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(item.color || '#a855f7'),
          roughness: 0.4,
          metalness: 0.2,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        container.add(mesh);
      } else {
        throw new Error('Fallback OBJ parse');
      }
    } catch {
      // Primitive Box fallback for OBJ
      const geom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color || '#eab308'),
        roughness: 0.3,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      container.add(mesh);
    }
  } else {
    // Default primitive asset geometry (e.g. Back Sword / Wings / Crown / Anime Hair / Headphones)
    let geom: THREE.BufferGeometry;
    let color = item.color || '#3b82f6';

    switch (item.category) {
      case 'hair':
        geom = new THREE.ConeGeometry(0.6, 1.2, 8);
        color = item.color || '#3b2314';
        break;
      case 'back':
        // Double blade or wing box setup
        geom = new THREE.BoxGeometry(0.2, 2.5, 0.4);
        color = item.color || '#ef4444';
        break;
      case 'hat':
        geom = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16);
        color = item.color || '#1e1b4b';
        break;
      case 'face':
        geom = new THREE.TorusGeometry(0.3, 0.05, 8, 16);
        color = item.color || '#06b6d4';
        break;
      default:
        geom = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        break;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.3,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    container.add(mesh);
  }

  // Apply relative offset (Position, Rotation, Scale)
  if (item.offset) {
    const { position, rotation, scale } = item.offset;
    if (position) container.position.set(position[0], position[1], position[2]);
    if (rotation) container.rotation.set(rotation[0], rotation[1], rotation[2]);
    if (scale) container.scale.set(scale[0], scale[1], scale[scale.length - 1] || 1);
  }

  return container;
}

/**
 * Attaches equipped custom accessories to their target body parts on an R6 Three.js character.
 */
export function attachFittedAccessoriesToAvatar(
  avatarGroup: THREE.Group,
  equippedAccessories: FittedAccessoryItem[],
  bodyPartMap: {
    head?: THREE.Object3D | null;
    torso?: THREE.Object3D | null;
    leftArm?: THREE.Object3D | null;
    rightArm?: THREE.Object3D | null;
    leftLeg?: THREE.Object3D | null;
    rightLeg?: THREE.Object3D | null;
  }
) {
  // Remove any previously attached fitted accessories
  avatarGroup.traverse((child) => {
    if (child.name.startsWith('fitted_acc_')) {
      child.removeFromParent();
    }
  });

  if (!equippedAccessories || equippedAccessories.length === 0) return;

  equippedAccessories.forEach((item) => {
    const accObj = buildFittedAccessoryObject(item);
    const bone = item.offset?.parentBone || 'Head';

    if (bone === 'Head' && bodyPartMap.head) {
      bodyPartMap.head.add(accObj);
    } else if ((bone === 'Torso' || bone === 'UpperTorso' || bone === 'Back') && bodyPartMap.torso) {
      bodyPartMap.torso.add(accObj);
    } else if (bone === 'LeftArm' && bodyPartMap.leftArm) {
      bodyPartMap.leftArm.add(accObj);
    } else if (bone === 'RightArm' && bodyPartMap.rightArm) {
      bodyPartMap.rightArm.add(accObj);
    } else if (bone === 'LeftLeg' && bodyPartMap.leftLeg) {
      bodyPartMap.leftLeg.add(accObj);
    } else if (bone === 'RightLeg' && bodyPartMap.rightLeg) {
      bodyPartMap.rightLeg.add(accObj);
    } else if (bodyPartMap.head) {
      bodyPartMap.head.add(accObj);
    } else {
      avatarGroup.add(accObj);
    }
  });
}
