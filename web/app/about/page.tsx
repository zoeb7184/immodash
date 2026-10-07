import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Cite } from "@/components/Cite";
import { Head, PageHero, Stat, Takeaway } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description: "Why ImmoDash exists: from growing up in Mumbai to looking for a flat in Germany, and turning rent into numbers anyone can check.",
};

export default function About() {
  return (
    <>
      <PageHero title="Why I built ImmoDash"
        lead="I grew up in Mumbai, one of the most crowded cities in the world. Moving to Germany taught me that the same question follows people on small incomes everywhere: how much of what I earn will the roof take?"
        label="The numbers behind this story"
        facts={<>
          <Stat label="Mumbai" value="~20" unit="million people" say={<>One of the largest cities on earth.<Cite id="unwup2018" /></>} />
          <Stat label="Living in slums" value="41.8%" unit="Greater Mumbai" say={<>About 5.2 million people, Census 2011.<Cite id="bhagat2016" /></>} />
          <Stat label="Germany, people at risk of poverty" value="43.7%" unit="of income" say={<>Goes on housing, against 24.1% on average (2025).<Cite id="destatis-share" /></>} />
          <Stat label="Overburdened" value="35.0%" unit="of them" say={<>Spend more than 40% of their income on housing, against 11.2% of everyone.<Cite id="destatis-overburden" /></>} />
        </>} />

      <section className="section tight">
        <div className="wrap split wl about-split">
          <figure className="about-photo reveal">
            <picture>
              <source srcSet="/img/mumbai-sunset.webp" type="image/webp" />
              <img src="/img/mumbai-sunset.jpg" width={1600} height={1067} loading="eager"
                alt="Mumbai's skyline at sunset seen from the beach, with people walking on the wet sand in the foreground" />
            </picture>
            <figcaption>
              Mumbai at sunset, seen from the beach. Photo:{" "}
              <a href="https://commons.wikimedia.org/wiki/File:Mumbai,_India,_Bombay,_Mumbai_skyline_at_sunset.jpg">Vyacheslav Argenberg</a>,{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, via Wikimedia Commons.
            </figcaption>
          </figure>
          <div className="prose reveal about-text">
            <h2>Growing up in Mumbai</h2>
            <p>
              Mumbai has close to 20 million inhabitants<Cite id="unwup2018" />. In the 2011 census, 41.8% of the people in Greater Mumbai, about
              5.2 million, lived in slums<Cite id="bhagat2016" />.
            </p>
            <p>
              Growing up there, I saw how housing shapes the lives of people on small incomes: where they can live, and how little is left at
              the end of the month once the roof is paid for. Housing is not one expense among many. For a low-income
              household it is the expense that decides the others.
            </p>
          </div>
        </div>
      </section>

      <section className="section band">
        <div className="wrap split">
          <div className="sticky reveal">
            <h2>Then Germany</h2>
            <p className="prose" style={{ marginTop: 14 }}>
              In November 2024 I moved to Bielefeld to study for an M.Sc. in Data Science, and went through the German flat search myself as a
              student.
            </p>
          </div>
          <div className="prose reveal">
            <p>
              Germany is a far richer country, yet the pattern is familiar. On average, households spend 24.1% of their disposable income on
              housing. For people at risk of poverty it is 43.7%<Cite id="destatis-share" />. More than a third of them, 35.0%, spend over 40% of
              their income on housing, against 11.2% of the whole population<Cite id="destatis-overburden" />.
            </p>
            <p>
              In the cities it is sharper still. A study of Germany&apos;s 77 big cities found that almost 13% of tenant households have less than
              the subsistence minimum left after paying rent<Cite id="holm2021" />. And a rent above 30% of net income is generally seen as
              problematic, because too little remains for everything else<Cite id="lebuhn2017" />.
            </p>
            <Takeaway label="The common thread">
              Whether in Mumbai or in a German city, the lower your income, the larger the share that rent takes. That is the question
              ImmoDash is built to answer with real numbers.
            </Takeaway>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Head title="Why data, and why open data">
            Renters usually have one number to go on: the price in the listing. I wanted to put that number in context, using only sources
            anyone can check.
          </Head>
          <ol className="steps reveal about-steps">
            <li>
              <span className="n">01</span>
              <div><h3>Is this rent normal?</h3><p>Compare a new lease with what people already pay and with the trend in 37 cities.</p></div>
              <Link className="textlink" href="/">The story <ArrowRight size={14} weight="bold" aria-hidden /></Link>
            </li>
            <li>
              <span className="n">02</span>
              <div><h3>Can I afford it?</h3><p>Check a flat against the 30% rule, or find every district where a budget works.</p></div>
              <Link className="textlink" href="/affordability">Affordability <ArrowRight size={14} weight="bold" aria-hidden /></Link>
            </li>
            <li>
              <span className="n">03</span>
              <div><h3>Where is it hardest?</h3><p>See where few flats stand empty while the population grows, in all 400 districts.</p></div>
              <Link className="textlink" href="/supply-demand">Supply &amp; demand <ArrowRight size={14} weight="bold" aria-hidden /></Link>
            </li>
            <li>
              <span className="n">04</span>
              <div><h3>Can I trust it?</h3><p>Every number comes from official or academic data, and every explanation links to a published source.</p></div>
              <Link className="textlink" href="/methodology">How it works <ArrowRight size={14} weight="bold" aria-hidden /></Link>
            </li>
          </ol>
        </div>
      </section>

      <section className="section band tight">
        <div className="wrap split">
          <div className="reveal">
            <h2>About me</h2>
          </div>
          <div className="prose reveal">
            <p>
              I&apos;m Zoeb Ali Khan, currently pursuing an M.Sc. in Data Science at Universität Bielefeld. I built ImmoDash end to end: the data
              pipeline, the models, the API and this website. It is an independent project and not affiliated with any of the data providers.
            </p>
            <div className="hero-cta" style={{ marginTop: 20 }}>
              <a className="btn" href="https://zoeb7184.github.io">Portfolio</a>
              <a className="textlink" href="https://linkedin.com/in/zoeb-ali-khan">LinkedIn <ArrowRight size={14} weight="bold" aria-hidden /></a>
              <a className="textlink" href="https://github.com/zoeb7184/immodash">Source code <ArrowRight size={14} weight="bold" aria-hidden /></a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
