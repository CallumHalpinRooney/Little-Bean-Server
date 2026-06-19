import type { Metadata } from 'next';
import Link from 'next/link';
import { FramedPoster } from '@/components/Poster';

export const metadata: Metadata = {
  title: 'Process',
  description:
    'What “premium” actually means at Lonrú Design — the paper, the framing and the production quality behind every piece.',
};

const SECTIONS = [
  {
    n: '01',
    title: 'The paper',
    body:
      'We print on 200gsm uncoated fine-art stock — a warm, matte surface with enough tooth to hold deep blacks without the plastic sheen of a typical photo poster. It looks like something that belongs in a gallery because the material is the same.',
  },
  {
    n: '02',
    title: 'The ink',
    body:
      'Archival pigment inks, not dye. Colours stay true for decades rather than fading to a yellow ghost in a sunlit room. The amber stays amber.',
  },
  {
    n: '03',
    title: 'The frame',
    body:
      'Solid timber mouldings in oak, walnut and matte black, cut and assembled per order with a shatter-resistant glaze. The frame is part of the design, never an afterthought bolted on at the warehouse.',
  },
  {
    n: '04',
    title: 'Made to order',
    body:
      'Nothing is mass-produced and stockpiled. Each piece is printed and framed only once you order it, through a vetted global production network — so it ships from the facility nearest you and travels the shortest distance to your wall.',
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="container-edge grid items-center gap-16 pb-12 pt-40 md:grid-cols-[1fr_0.8fr]">
        <div>
          <span className="eyebrow">The studio</span>
          <h1 className="display-xl mt-6 text-balance">
            Premium is a<br />
            <span className="italic text-brass">decision</span>, not a price.
          </h1>
          <p className="mt-8 max-w-readable text-lead text-bone-dim">
            Lonrú — Irish for radiance — makes wall art the way a furniture maker
            makes a chair: chosen materials, considered proportions, and the patience
            to make each one to order. Here&apos;s exactly what that means.
          </p>
        </div>
        <div className="mx-auto w-[70%] md:w-[85%]">
          <FramedPoster collection="motivation" seed="motivation-rule-brass" frame="walnut" priority />
        </div>
      </section>

      <section className="container-edge py-section">
        <div className="grid gap-x-12 gap-y-16 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.n} className="border-t border-line pt-6">
              <span className="font-serif text-3xl text-brass">{s.n}</span>
              <h2 className="mt-3 font-serif text-3xl">{s.title}</h2>
              <p className="mt-4 text-body text-bone-dim">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line">
        <div className="container-edge py-section text-center">
          <h2 className="display-lg mx-auto max-w-2xl text-balance">
            The energy of sport and speed, treated like fine art.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-body text-bone-dim">
            Every Lonrú piece is original artwork — mood, motion and silhouette. We
            never reproduce team liveries, logos or recognisable likenesses; the
            feeling is the subject.
          </p>
          <Link href="/motorsport" className="btn-outline mt-10">
            See the collections
          </Link>
        </div>
      </section>
    </>
  );
}
