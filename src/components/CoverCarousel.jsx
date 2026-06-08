const ROW1 = ['c1', 'f1', 'c3', 'c5', 'f2', 'c7', 'c2', 'f3', 'c9', 'c4', 'c6', 'f4']
const ROW2 = ['c6', 'c8', 'f5', 'c2', 'c4', 'f6', 'c1', 'c7', 'c3', 'f2', 'c5', 'c9']

function CarouselRow({ items, className }) {
  const doubled = [...items, ...items]
  return (
    <div className={className}>
      {doubled.map((cls, i) => (
        <div key={i} className={`cc ${cls}`} />
      ))}
    </div>
  )
}

export default function CoverCarousel() {
  return (
    <div className="cw">
      <CarouselRow items={ROW1} className="ct" />
      <CarouselRow items={ROW2} className="ct2" />
    </div>
  )
}
