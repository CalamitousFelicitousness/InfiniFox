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
    denoisingStrength,
    setDenoisingStrength,
    generateImg2Img,
    isLoading,
    exportImageAsBase64,
    images,
    activeImageRoles,
    // Layer system state
    layers,
    selectedLayerIds: storeSelectedLayerIds,
    getLayer,
    activeLayerRoles,
    getLayerRole,
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([])
  const [useLayerSystem, setUseLayerSystem] = useState(false)

  // Check if layer system is enabled
  useEffect(() => {
    setUseLayerSystem(Object.keys(layers).length > 0)
  }, [layers])

  // Unified role and selection detection
  useEffect(() => {
    // Priority 1: Check for layer with img2img_init role
    const roleLayer = activeLayerRoles.find((r) => r.role === 'img2img_init')
    if (roleLayer) {
      const layer = getLayer(roleLayer.layerId)
      if (
        layer &&
        (layer.type === 'image' ||
          layer.type === 'drawing' ||
          layer.type === 'text' ||
          layer.type === 'artboard')
      ) {
        setSelectedLayerId(roleLayer.layerId)
        setSelectedLayerIds([roleLayer.layerId])
        setSelectedImageId(null)
        // Export layer as base64
        const exportPromise =
          layer.type === 'artboard'
            ? LayerExportService.exportArtboardAsBase64(roleLayer.layerId)
            : LayerExportService.exportLayerAsBase64(roleLayer.layerId)

        exportPromise
          .then((base64) => {
            if (base64) {
              setBaseImage(base64)
              // Try to get dimensions from layer
              if (layer.type === 'artboard' && layer.artboardProps) {
                setWidth(layer.artboardProps.width || 800)
                setHeight(layer.artboardProps.height || 600)
              } else {
                const bounds = useStore.getState().getLayerBounds(roleLayer.layerId)
                if (bounds) {
                  setWidth(bounds.width)
                  setHeight(bounds.height)
                }
              }
            }
          })
          .catch((error) => {
            console.error('Failed to export layer:', error)
            setBaseImage('')
          })
        return
      }
    }

    // Priority 2: Check for multiple selected layers (only if layer system is active)
    if (useLayerSystem && storeSelectedLayerIds.size > 1) {
      const validLayerIds = Array.from(storeSelectedLayerIds).filter((id) => {
        const layer = getLayer(id)
        return layer && layer.type !== 'group'
      })

      if (validLayerIds.length > 0) {
        setSelectedLayerId(null) // Multiple selection
        setSelectedLayerIds(validLayerIds)
        setSelectedImageId(null)
        // Export as composite
        LayerExportService.exportLayersAsComposite(validLayerIds)
          .then((result) => {
            if (result) {
              setBaseImage(result.base64)
              setWidth(result.width)
              setHeight(result.height)
            }
          })
          .catch((error) => {
            console.error('Failed to export layers as composite:', error)
            setBaseImage('')
          })
        return
      }
    }

    // Priority 3: Check for single selected layer (only if layer system is active)
    if (useLayerSystem && storeSelectedLayerIds.size === 1) {
      const layerId = Array.from(storeSelectedLayerIds)[0]
      const layer = getLayer(layerId)

      // Skip group layers
      if (layer && layer.type !== 'group') {
        setSelectedLayerId(layerId)
        setSelectedLayerIds([layerId])
        setSelectedImageId(null)
        // Export layer as base64
        const exportPromise =
          layer.type === 'artboard'
            ? LayerExportService.exportArtboardAsBase64(layerId)
            : LayerExportService.exportLayerAsBase64(layerId)

        exportPromise
          .then((base64) => {
            if (base64) {
              setBaseImage(base64)
              // Try to get dimensions from layer
              if (layer.type === 'artboard' && layer.artboardProps) {
                setWidth(layer.artboardProps.width || 800)
                setHeight(layer.artboardProps.height || 600)
              } else {
                const bounds = useStore.getState().getLayerBounds(layerId)
                if (bounds) {
                  setWidth(bounds.width)
                  setHeight(bounds.height)
                }
              }
            }
          })
          .catch((error) => {
            console.error('Failed to export layer:', error)
            setBaseImage('')
          })
        return
      }
    }

    // Priority 4: Check for image with img2img_init role
    const roleImage = activeImageRoles.find((r) => r.role === 'img2img_init')
    if (roleImage) {
      const image = images.find((img) => img.id === roleImage.imageId)
      if (image) {
        setSelectedLayerId(null)
        setSelectedLayerIds([])
        setSelectedImageId(roleImage.imageId)
        exportImageAsBase64(roleImage.imageId)
          .then((base64) => {
            setBaseImage(base64)
            if (image.width && image.height) {
              setWidth(image.width)
              setHeight(image.height)
            }
          })
          .catch((error) => {
            console.error('Failed to load role-assigned image:', error)
            setBaseImage('')
          })
        return
      }
    }

    // Priority 5: Clear everything if nothing is found
    setSelectedLayerId(null)
    setSelectedLayerIds([])
    setSelectedImageId(null)
    setBaseImage('')
  }, [
    storeSelectedLayerIds,
    useLayerSystem,
    getLayer,
    activeLayerRoles,
    activeImageRoles,
    images,
    exportImageAsBase64,
    setWidth,
    setHeight,
  ])

  const handleGenerate = async (e: Event) => {
    e.preventDefault()

    // Export fresh base64 from layer or image
    let finalBase64 = baseImage

    // Try layers first
    if (selectedLayerIds.length > 1) {
      // Export multiple layers as composite
      try {
        const result = await LayerExportService.exportLayersAsComposite(selectedLayerIds)
        if (result) {
          finalBase64 = result.base64
        } else {
          alert('Failed to export layers as composite')
          return
        }
      } catch (error) {
        console.error('Failed to export layers:', error)
        alert('Failed to export layers')
        return
      }
    } else if (selectedLayerId) {
      // Export single layer
      try {
        const layer = getLayer(selectedLayerId)
        const exported =
          layer?.type === 'artboard'
            ? await LayerExportService.exportArtboardAsBase64(selectedLayerId)
            : await LayerExportService.exportLayerAsBase64(selectedLayerId)
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
      // Export from image (fallback when no layers selected)
      try {
        finalBase64 = await exportImageAsBase64(selectedImageId)
      } catch (error) {
        console.error('Failed to export image:', error)
        alert('Failed to export image')
        return
      }
    }

    if (!finalBase64) {
      alert('Please select a layer or image from canvas first')
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
      {useLayerSystem && selectedLayerIds.length > 0 && (
        <div
          className="selected-layer-info"
          style={{
            padding: '10px',
            backgroundColor:
              selectedLayerId && getLayerRole(selectedLayerId) === 'img2img_init'
                ? '#dcfce7'
                : '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          {selectedLayerId && getLayerRole(selectedLayerId) === 'img2img_init' && (
            <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>
              ✓ Role assigned
            </div>
          )}
          {selectedLayerIds.length > 1 ? (
            <div>
              <div>Multiple Layers Selected: {selectedLayerIds.length} layers</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Will be exported as composite image
              </div>
            </div>
          ) : (
            <div>
              <div>Layer: {getLayer(selectedLayerId || '')?.name || selectedLayerId}</div>
              {getLayer(selectedLayerId || '')?.type && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  Type: {getLayer(selectedLayerId || '')?.type}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedImageId && !selectedLayerId && (
        <div
          className="selected-image-info"
          style={{
            padding: '10px',
            backgroundColor: activeImageRoles.some(
              (r) => r.role === 'img2img_init' && r.imageId === selectedImageId
            )
              ? '#dcfce7'
              : '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          {activeImageRoles.some(
            (r) => r.role === 'img2img_init' && r.imageId === selectedImageId
          ) && (
            <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>
              ✓ Role assigned
            </div>
          )}
          <div>Image: {selectedImageId.slice(-6)}</div>
        </div>
      )}

      {!selectedLayerIds.length && !selectedImageId && (
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
          Please select a layer or image on the canvas, or assign the img2img role to a layer/image
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
