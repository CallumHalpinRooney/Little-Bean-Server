import type { ReactElement, SVGProps } from "react";
import {
  IconAssess,
  IconFinance,
  IconHealthcare,
  IconMaintain,
  IconProfessional,
  IconPublicSector,
  IconRemediate,
  IconReport,
  IconRetail,
  IconTechnology,
  IconTrain,
  IconVerify,
} from "@/components/icons";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

/** Content files reference icons by key; this maps keys to components. */
export const iconMap: Record<string, IconComponent> = {
  assess: IconAssess,
  report: IconReport,
  remediate: IconRemediate,
  train: IconTrain,
  verify: IconVerify,
  maintain: IconMaintain,
  finance: IconFinance,
  healthcare: IconHealthcare,
  technology: IconTechnology,
  retail: IconRetail,
  public: IconPublicSector,
  professional: IconProfessional,
};

export function getIcon(key: string): IconComponent {
  return iconMap[key] ?? IconAssess;
}
