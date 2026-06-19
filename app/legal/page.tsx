import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Legal',
  description: 'Shipping, returns, privacy and terms for Lonrú Design.',
};

/**
 * Legal copy reflects a print-on-demand model: fulfilment and returns follow
 * the production partner's actual terms so nothing is promised that can't be
 * delivered. Review with a solicitor before going live.
 */
export default function LegalPage() {
  return (
    <div className="container-edge max-w-readable pb-section pt-40">
      <span className="eyebrow">The fine print</span>
      <h1 className="display-lg mt-6">Policies</h1>
      <p className="mt-4 text-caption text-bone-muted">Last updated: 19 June 2026</p>

      <nav className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-5 text-caption uppercase tracking-[0.14em]">
        <a href="#shipping" className="link-underline">Shipping</a>
        <a href="#returns" className="link-underline">Returns</a>
        <a href="#privacy" className="link-underline">Privacy</a>
        <a href="#terms" className="link-underline">Terms</a>
      </nav>

      <Section id="shipping" title="Shipping policy">
        <p>
          All Lonrú pieces are printed and framed to order through our print-on-demand
          partner&apos;s global production network. Orders are routed to the production
          facility nearest the delivery address, which keeps transit short and reduces
          shipping impact.
        </p>
        <ul>
          <li>Production: typically 2–5 business days before dispatch.</li>
          <li>Delivery: tracked; transit time varies by destination (usually 3–8 business days after dispatch).</li>
          <li>Framed pieces ship boxed with corner protection.</li>
          <li>
            Shipping fees and any import duties/taxes are calculated at checkout or
            payable on delivery depending on destination. We do not profit from
            shipping.
          </li>
        </ul>
        <p>
          Estimated dates are not guarantees; carrier and customs delays are outside
          our control.
        </p>
      </Section>

      <Section id="returns" title="Returns &amp; refunds">
        <p>
          Because every item is made to order, we follow our production partner&apos;s
          fulfilment terms rather than offering open-ended change-of-mind returns:
        </p>
        <ul>
          <li>
            <strong>Damaged or defective items:</strong> if your piece arrives damaged,
            misprinted or with a manufacturing fault, contact us within 30 days of
            delivery with photos. We&apos;ll arrange a free replacement or a refund.
          </li>
          <li>
            <strong>Wrong item:</strong> if you receive the wrong product, we&apos;ll
            correct it at no cost.
          </li>
          <li>
            <strong>Change of mind:</strong> as items are custom-produced, we cannot
            accept returns for buyer&apos;s remorse or incorrect address details. Please
            check your size, frame and shipping address carefully before ordering.
          </li>
        </ul>
        <p>
          To start a claim, email{' '}
          <a href="mailto:hello@lonru.design" className="link-underline text-bone">
            hello@lonru.design
          </a>{' '}
          with your order reference.
        </p>
      </Section>

      <Section id="privacy" title="Privacy policy">
        <p>
          We collect only what we need to fulfil your order: your name, contact
          details, shipping address and order history. Payment is processed by Stripe —
          we never see or store your full card details. Fulfilment data is shared with
          our print partner solely to produce and ship your order.
        </p>
        <ul>
          <li>We do not sell your personal data.</li>
          <li>You can request a copy or deletion of your data at any time.</li>
          <li>
            Cookies are used only for essential site function and aggregate analytics.
          </li>
        </ul>
        <p>
          Requests:{' '}
          <a href="mailto:privacy@lonru.design" className="link-underline text-bone">
            privacy@lonru.design
          </a>
          .
        </p>
      </Section>

      <Section id="terms" title="Terms of sale">
        <p>
          By placing an order you agree that all artwork is original to Lonrú Design and
          provided for personal, non-commercial display. Artwork, imagery and text on
          this site may not be reproduced or resold without written permission.
        </p>
        <ul>
          <li>Prices are in EUR and may change without notice; the price at checkout applies.</li>
          <li>Orders are confirmed once payment is successfully processed by Stripe.</li>
          <li>
            Colours may vary slightly between screens and the printed piece due to the
            nature of fine-art printing.
          </li>
        </ul>
        <p className="text-caption text-bone-muted">
          This page is a starting template and should be reviewed by a qualified
          solicitor before launch.
        </p>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-line py-12">
      <h2 className="font-serif text-3xl">{title}</h2>
      <div className="legal-body mt-6 space-y-4 text-body text-bone-dim [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
