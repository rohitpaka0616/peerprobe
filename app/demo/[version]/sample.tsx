"use client";
import { useState } from "react";
import {
  MapPin,
  BedDouble,
  Bath,
  Trees,
  Minus,
  Plus,
  ArrowLeft,
  Heart,
  Sun,
} from "lucide-react";
export default function Apartment({ fixed }: { fixed: boolean }) {
  const [people, setPeople] = useState(2),
    [liked, setLiked] = useState(false);
  return (
    <div className="nest">
      <style>{`
.nest{min-height:100vh;background:#f8f7f3;color:#454b3f;font-family:Arial,sans-serif}.nest header{height:62px;background:#fffefb;padding:0 27px;border-bottom:1px solid #e8e8df;display:flex;align-items:center;justify-content:space-between}.nest-brand{font: bold 28px Georgia,serif;letter-spacing:-1px;color:#6d7d5c}.nest-brand span{color:#b1bd95}.nest header small{font-size:9px;color:#a1a18e}.nest main{padding:23px 27px 30px;max-width:680px;margin:auto}.nest-back{display:flex;align-items:center;gap:6px;font-size:9px;color:#a2a28e;margin-bottom:16px}.apartment-photo{height:218px;border-radius:10px;overflow:hidden;position:relative;background:linear-gradient(0deg,#76765b22,#c7d1be11),linear-gradient(110deg,#d4d4b7 0%,#e8e5d5 45%,#c5c5aa 46%,#eeebdb 100%)}.room-window{position:absolute;top:14px;left:39px;width:119px;height:149px;background:linear-gradient(130deg,#d7e6d8,#a7c5ab);border:9px solid #faf7e8;box-shadow:7px 7px 13px #535a3230}.room-window:before,.room-window:after{content:'';position:absolute;background:#faf7e8}.room-window:before{width:5px;height:100%;left:48%}.room-window:after{height:5px;width:100%;top:48%}.room-sofa{position:absolute;bottom:29px;right:28px;width:52%;height:65px;background:#e6dfca;border-radius:10px 10px 4px 4px;box-shadow:0 9px 4px #555b3820,0 -17px 0 #d8cfb5}.room-sofa:before{content:'';position:absolute;width:30%;height:37px;top:-18px;left:14px;background:#aeb89a;border-radius:6px;transform:rotate(-9deg)}.room-table{position:absolute;width:26%;height:12px;left:27%;bottom:21px;border-radius:50%;background:#b7a280;box-shadow:0 12px 0 -4px #9c896d}.room-plant{position:absolute;right:12px;bottom:55px;font-size:75px;filter:saturate(.5)}.photo-tag{position:absolute;top:14px;left:14px;padding:5px 8px;background:#fffef3d9;border-radius:4px;font-size:8px;color:#83866c}.nest-like{position:absolute;top:12px;right:12px;border:0;width:29px;height:29px;border-radius:50%;background:#ffffffe8;display:grid;place-items:center;color:#9b9d86}.nest h1{font-family:Georgia,serif;font-weight:400;font-size:27px;letter-spacing:-.6px;margin:23px 0 5px;color:#424d38}.nest-address{display:flex;align-items:center;gap:4px;color:#a4a68e;font-size:10px}.nest-features{display:flex;gap:22px;margin:19px 0;padding-bottom:20px;border-bottom:1px solid #e3e4d9;color:#92977d;font-size:9px}.nest-features span{display:flex;gap:5px;align-items:center}.nest-description{font-size:11px;color:#9c9e8d;line-height:1.8;margin:14px 0 22px}.rent-card{padding:22px;background:#fffefb;border:1px solid #e3e5d6;border-radius:10px}.rent-top{display:flex;justify-content:space-between;align-items:center}.rent-top h2{font-size:13px;color:#667254;margin:0}.rent-total{font-size:24px;color:#57674a;letter-spacing:-.7px;font-weight:600}.rent-total small{font-size:9px;color:#a0a68e;letter-spacing:0;font-weight:400}.rent-divider{border-top:1px solid #eceee3;margin:16px 0}.rent-people{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#90997f}.stepper{display:flex;align-items:center;border:1px solid #dfe4d5;border-radius:6px;overflow:hidden}.stepper button{border:0;background:#f7f8f0;padding:8px;color:#929f7c}.stepper output{width:31px;text-align:center;font-size:12px;font-weight:600;color:#6e7c5c}.per-person{display:flex;justify-content:space-between;align-items:center;background:#eff3e9;padding:14px;border-radius:6px;margin-top:17px;font-size:10px;color:#8b9979}.per-person strong{font-size:22px;color:#768b5d;letter-spacing:-.5px}.per-person small{font-size:8px;margin-left:4px}.nest-note{text-align:center;font-size:8px;color:#b0b5a0;margin:12px 0 0}.nest-version{text-align:center;font-size:8px;color:#b6b8aa;margin-top:23px}@media(max-width:420px){.nest main{padding:18px}.nest header{padding:0 18px}.apartment-photo{height:190px}.nest-features{gap:15px}.rent-card{padding:18px}}
`}</style>
      <header>
        <span className="nest-brand">
          nest<span>.</span>
        </span>
        <small>FIND YOUR NEXT CHAPTER</small>
      </header>
      <main>
        <div className="nest-back">
          <ArrowLeft size={12} />
          Your next home
        </div>
        <div
          className="apartment-photo"
          role="img"
          aria-label="Illustration of a sunny living room with a sofa, window, and houseplant"
        >
          <div className="room-window" />
          <div className="room-sofa" />
          <div className="room-table" />
          <span className="room-plant">🪴</span>
          <span className="photo-tag">A PLACE TO CALL YOURS</span>
          <button
            className="nest-like"
            aria-label={liked ? "Unsave apartment" : "Save apartment"}
            onClick={() => setLiked(!liked)}
          >
            <Heart size={14} fill={liked ? "#a8b38f" : "none"} />
          </button>
        </div>
        <h1>Maple Court Apartment</h1>
        <div className="nest-address">
          <MapPin size={11} />
          24 Maple Avenue · University District
        </div>
        <div className="nest-features">
          <span>
            <BedDouble size={13} />3 bedrooms
          </span>
          <span>
            <Bath size={13} />2 bathrooms
          </span>
          <span>
            <Sun size={13} />
            Lots of light
          </span>
        </div>
        <p className="nest-description">
          Room for your people, space for your life. A sunny apartment just a
          short walk from campus, with a shared living room and a little corner
          for everything.
        </p>
        <section className="rent-card">
          <div className="rent-top">
            <h2>Make it work together</h2>
            <div className="rent-total">
              $2,400<small> / month</small>
            </div>
          </div>
          <div className="rent-divider" />
          <div className="rent-people">
            <label htmlFor="people-count">People splitting rent</label>
            <div className="stepper">
              <button
                aria-label="Fewer people"
                disabled={people <= 1}
                onClick={() => setPeople((p) => p - 1)}
              >
                <Minus size={12} />
              </button>
              <output id="people-count" aria-live="polite">
                {people}
              </output>
              <button
                aria-label="More people"
                disabled={people >= 8}
                onClick={() => setPeople((p) => p + 1)}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="per-person">
            <span>Each person pays</span>
            <div>
              <strong aria-live="polite">
                $
                {(fixed ? 2400 / people : 1200).toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </strong>
              <small>/ month</small>
            </div>
          </div>
          <p className="nest-note">
            Good places are even better when you share them.
          </p>
        </section>
        <div className="nest-version">
          Nest sample app · {fixed ? "v1.1" : "v1.0"} · Preview for peer testing
        </div>
      </main>
    </div>
  );
}
