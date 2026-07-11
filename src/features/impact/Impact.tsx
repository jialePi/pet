import { Heart, IceCreamBowl, Leaf, PawPrint, ShieldCheck, ShoppingBasket } from "lucide-react";
import type { ImpactMetrics, PetState } from "../../types/domain";

type ImpactProps = {
  impact: ImpactMetrics;
  pet: PetState;
};

export function Impact({ impact, pet }: ImpactProps) {
  return (
    <section className="impact-view">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Impact</span>
          <h1>Waste-less progress</h1>
        </div>
      </div>
      <div className="impact-grid">
        <ImpactCard icon={<Leaf />} label="Items rescued" value={impact.savedItemCount} />
        <ImpactCard
          icon={<ShieldCheck />}
          label="Duplicate buys avoided"
          value={impact.duplicatePurchaseAvoidedCount}
        />
        <ImpactCard
          icon={<ShoppingBasket />}
          label="Shopping checks"
          value={impact.shoppingCheckCount}
        />
        <ImpactCard icon={<IceCreamBowl />} label="Frozen for later" value={impact.frozenItemCount} />
        <ImpactCard icon={<Heart />} label="Shared" value={impact.sharedItemCount} />
        <ImpactCard icon={<PawPrint />} label="Streak days" value={impact.streakDays} />
      </div>
      <p className="privacy-note">
        Estimated waste avoided: {impact.estimatedSavedWeightGrams ?? 0}g. Duplicate-buy
        prevention, rescue actions, and freezing are behavior signals, not verified
        environmental claims. Buy-anyway overrides: {impact.buyAnywayCount}.
      </p>
      <p className="privacy-note">
        Dates and suggestions are planning aids. Check smell, appearance, packaging, storage conditions, and local food safety guidance before eating.
      </p>
      <div className={`pet-summary ${pet.visualState}`}>
        Pet is {pet.visualState}. Health {pet.health}, mood {pet.mood}, energy {pet.energy}.
      </div>
    </section>
  );
}

function ImpactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="impact-card">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
