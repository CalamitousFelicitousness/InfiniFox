import { useState, useEffect } from 'react'

import { Dropdown } from '../../components/common/Dropdown'
import { NumberInput } from '../../components/common/NumberInput'
import { Slider } from '../../components/common/Slider'
import { LayerExportService } from '../../services/layers/LayerExportService'
import { useStore } from '../../store/store'

import './Img2ImgPanel.css'

export function Img2ImgPanel() {
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    sampler,
    setSampler,
    samplers,
    seed,
    setSeed,
    steps,
    setSteps,
    cfgScale,
    setCfgScale,
    width,
    setWidth,
    height,
    setHeight,
    generateImg2Img,
    isLoading,
    exportImageAsBase64,
    images,
    activeImageRoles,
    // Layer system state
    layers,
    selectedLayerIds,
    getLayer,
    activeLayerRoles,
    getLayerRole,
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [useLayerSystem, setUseLayerSystem] = useState(false)

  // Check if layer system is enabled
  useEffect(() => {
    setUseLayerSystem(Object.keys(layers).length > 0)
  }, [layers])

  // Auto-select from layers with roles or selection
  useEffect(() => {
    if (useLayerSystem) {
      // First check for layer with img2img_init role
      const roleLayer = activeLayerRoles.find((r) => r.role === 'img2img_init')
      if (roleLayer) {
        const layer = getLayer(roleLayer.layerId)
        if (layer && (layer.type === 'image' || layer.type === 'drawing')) {
          setSelectedLayerId(roleLayer.layerId)
          // Export layer as base64
          LayerExportService.exportLayerAsBase64(roleLayer.layerId)
            .then((base64) => {
              if (base64) {
                setBaseImage(base64)
                // Try to get dimensions from layer
                const bounds = useStore.getState().getLayerBounds(roleLayer.layerId)
                if (bounds) {
                  setWidth(bounds.width)
                  setHeight(bounds.height)
                }
              }
            })
            .catch((error) => {
              console.error('Failed to export layer:', error)
            })
          return
        }
      }

      // Fallback to selected layer if no role assigned
      if (selectedLayerIds.size > 0) {
        const firstSelectedId = Array.from(selectedLayerIds)[0]
        const layer = getLayer(firstSelectedId)
        if (layer && (layer.type === 'image' || layer.type === 'drawing')) {
          setSelectedLayerId(firstSelectedId)
          // Export layer as base64
          LayerExportService.exportLayerAsBase64(firstSelectedId)
            .then((base64) => {
              if (base64) {
                setBaseImage(base64)
                // Try to get dimensions from layer
                const bounds = useStore.getState().getLayerBounds(firstSelectedId)
                if (bounds) {
                  setWidth(bounds.width)
                  setHeight(bounds.height)
                }
              }
            })
            .catch((error) => {
              console.error('Failed to export layer:', error)
            })
        }
      } else {
        // No role or selection, clear
        setSelectedLayerId(null)
        setBaseImage('')
      }
    }
  }, [selectedLayerIds, useLayerSystem, getLayer, activeLayerRoles, setWidth, setHeight])

  // Auto-load image with img2img_init role (legacy)
  useEffect(() => {
    if (useLayerSystem) return // Skip if using layer system

    const roleImage = activeImageRoles.find((r) => r.role === 'img2img_init')
    if (roleImage) {
      const image = images.find((img) => img.id === roleImage.imageId)
      if (image) {
        exportImageAsBase64(roleImage.imageId)
          .then((base64) => {
            setBaseImage(base64)
            setSelectedImageId(roleImage.imageId)
            if (image.width && image.height) {
              setWidth(image.width)
              setHeight(image.height)
            }
          })
          .catch((error) => {
            console.error('Failed to load role-assigned image:', error)
          })
      }
    } else {
      setBaseImage('')
      setSelectedImageId(null)
    }
  }, [activeImageRoles, images, exportImageAsBase64, setHeight, setWidth, useLayerSystem])

  const handleGenerate = async (e: Event) => {
    e.preventDefault()

    // Export fresh base64 from layer or image
    let finalBase64 = baseImage

    if (useLayerSystem && selectedLayerId) {
      // Export from layer
      try {
        const exported = await LayerExportService.exportLayerAsBase64(selectedLayerId)
        if (exported) {
          finalBase64 = exported
        } else {
          alert('Failed to export layer')
          return
        }
      } catch (error) {
        console.error('Failed to export layer:', error)
        alert('Failed to export layer')
        return
      }
    } else if (selectedImageId) {
      // Export from legacy image
      try {
        finalBase64 = await exportImageAsBase64(selectedImageId)
      } catch (error) {
        console.error('Failed to export image:', error)
        alert('Failed to export image')
        return
      }
    }

    if (!finalBase64) {
      alert(
        useLayerSystem
          ? 'Please select a layer from canvas first'
          : 'Please select an image from canvas first'
      )
      return
    }

    if (!isLoading) {
      generateImg2Img(finalBase64, denoisingStrength)
    }
  }

  return (
    <div className="generation-panel">
      <h3 className="generation-panel-header">Image to Image</h3>

      {/* Layer/Image selection indicator */}
      {useLayerSystem && selectedLayerId && (
        <div
          className="selected-layer-info"
          style={{
            padding: '10px',
            backgroundColor:
              getLayerRole(selectedLayerId) === 'img2img_init' ? '#dcfce7' : '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '10px',
            border: getLayerRole(selectedLayerId) === 'img2img_init' ? '1px solid #4ade80' : 'none',
          }}
        >
          <strong>Selected Layer:</strong> {getLayer(selectedLayerId)?.name || 'Unknown'}
          {getLayerRole(selectedLayerId) === 'img2img_init' && (
            <span style={{ marginLeft: '8px', color: '#16a34a', fontSize: '12px' }}>
              (Role Assigned)
            </span>
          )}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {getLayerRole(selectedLayerId) === 'img2img_init'
              ? 'This layer is set for img2img generation'
              : 'Select a layer on canvas to use as input'}
          </div>
        </div>
      )}

      {!useLayerSystem && selectedImageId && (
        <div
          className="selected-image-info"
          style={{
            padding: '10px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <strong>Selected Image:</strong> {selectedImageId}
        </div>
      )}

      {!selectedLayerId && !selectedImageId && (
        <div
          className="no-selection-info"
          style={{
            padding: '10px',
            backgroundColor: '#fff3cd',
            borderRadius: '4px',
            marginBottom: '10px',
            color: '#856404',
          }}
        >
          {useLayerSystem
            ? 'Please select a layer on the canvas'
            : 'Please select an image on the canvas'}
        </div>
      )}

      <form className="generation-form" onSubmit={handleGenerate}>
        <div className="prompt-group">
          <label className="prompt-label">Prompt</label>
          <textarea
            className="prompt-textarea"
            value={prompt}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            disabled={isLoading}
          />
        </div>

        <div className="prompt-group">
          <label className="prompt-label">Negative Prompt</label>
          <textarea
            className="prompt-textarea"
            value={negativePrompt}
            onInput={(e) => setNegativePrompt(e.currentTarget.value)}
            disabled={isLoading}
          />
        </div>

        <Slider
          label="Denoising Strength"
          value={denoisingStrength}
          onInput={setDenoisingStrength}
          min={0}
          max={1}
          step={0.05}
          disabled={isLoading}
        />

        <Dropdown
          label="Sampler"
          value={sampler}
          onInput={setSampler}
          options={samplers.map((s) => s.name)}
          disabled={isLoading}
        />

        <NumberInput label="Seed" value={seed} onInput={setSeed} disabled={isLoading} />

        <Slider
          label="Steps"
          value={steps}
          onInput={setSteps}
          min={1}
          max={100}
          step={1}
          disabled={isLoading}
        />

        <Slider
          label="CFG Scale"
          value={cfgScale}
          onInput={setCfgScale}
          min={1}
          max={30}
          step={0.5}
          disabled={isLoading}
        />

        <div className="size-inputs-group">
          <NumberInput label="Width" value={width} onInput={setWidth} disabled={isLoading} />
          <NumberInput label="Height" value={height} onInput={setHeight} disabled={isLoading} />
        </div>

        <div className="generation-actions">
          <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </form>
    </div>
  )
}
