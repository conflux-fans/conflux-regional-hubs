import { region } from "../../config/regions";
import { Footer, Header } from "../site-components";
import { StakeClient } from "./stake-client";

export default function Stake() {
  return (
    <main className={`stake-page stake-page-${region.presentation.pages.stake}`}>
      <Header />
      <section className="inner-hero stake-inner-hero">
        <p className="eyebrow">{region.stake.eyebrow}</p>
        <h1>{region.stake.headline}</h1>
        <p>{region.stake.introduction} {region.stake.copy.pageSuffix}</p>
      </section>
      <StakeClient />
      <Footer />
    </main>
  );
}
