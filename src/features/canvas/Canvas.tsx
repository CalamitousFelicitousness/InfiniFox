import { useEffect, useState } from 'preact/hooks'
import { Stage, Layer, Image as KonvaImage } from 'react-konva'

import { useStore } from '../../store/store'

export function Canvas() {
  const { images } = useStore()
  const [konvaImages, setKonvaImages] = useState<any[]>([])

  useEffect(() => {
    const imagePromises = images.map((imgData) => {
      return new Promise((resolve) => {
        const img = new window.Image()
        img.src = imgData.src
        img.onload = () => resolve({ ...imgData, image: img })
      })
    })

    Promise.all(imagePromises).then(setKonvaImages)
  }, [images])

  return (
    <div class="canvas-container">
      <Stage
        width={window.innerWidth - 350} // Subtract control panel width
        height={window.innerHeight}
        draggable
      >
        <Layer>
          {konvaImages.map((img) => (
            <KonvaImage key={img.id} image={img.image} x={img.x} y={img.y} draggable />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
