
    const CANVAS_RATIO = 3 / 4;
    const settings = {
      count: 260,
      sizeScale: 1.6,
      speedScale: 1,
      overlapScale: 1.15,
      swimmerMode: 0,
      sceneMode: 0
    };
    const swimmerModes = ["锦鲤鱼群", "小鸭群", "一叶小舟", "纸飞机", "骑行"];
    const sceneModes = ["清晨", "正午", "黄昏", "夜晚"];
    const particles = [];
    const flowers = [];
    const halfFlowers = [];
    const buds = [];
    const pods = [];
    const koi = [];
    const frogs = [];
    const dragonflies = [];
    const pointerForces = [];
    const frogSplashes = [];
    const koiTrail = [];
    const sceneClouds = [];
    let pointerHasEntered = false;
    let pointerMoveFrames = 0;
    let pointerSettleFrames = 0;
    let noiseLayer;
    let paperPlaneImage;
    let ridingImage;
    const scenePalette = [
      {
        skyTop: [126, 210, 194],
        skyBottom: [58, 154, 144],
        waterTop: [52, 152, 150],
        waterBottom: [22, 92, 104],
        wash: [145, 238, 224],
        mist: [245, 246, 230],
        moon: null
      },
      {
        skyTop: [86, 188, 194],
        skyBottom: [28, 110, 126],
        waterTop: [38, 128, 138],
        waterBottom: [12, 76, 92],
        wash: [132, 224, 224],
        mist: [255, 255, 240],
        moon: null
      },
      {
        skyTop: [232, 170, 116],
        skyBottom: [114, 86, 103],
        waterTop: [92, 132, 130],
        waterBottom: [26, 68, 82],
        wash: [255, 190, 132],
        mist: [255, 232, 211],
        moon: null
      },
      {
        skyTop: [14, 26, 54],
        skyBottom: [5, 16, 34],
        waterTop: [15, 49, 81],
        waterBottom: [4, 19, 40],
        wash: [96, 136, 206],
        mist: [198, 214, 245],
        moon: [236, 241, 228]
      }
    ];

    class MotionBody {
      constructor(anchor) {
        this.anchor = anchor.copy();
        this.position = anchor.copy();
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
        this.baseMaxSpeed = random(2.6, 4.2);
        this.boostFrames = 0;
      }

      applyForce(force) {
        this.acceleration.add(force);
      }

      repelFrom(point, strength, influenceRadius) {
        const offset = p5.Vector.sub(this.position, point);
        const distance = offset.mag();

        if (distance > influenceRadius || distance === 0) return;

        const falloff = 1 - distance / influenceRadius;
        const snap = map(distance, 0, influenceRadius, 1, 0.18);
        const force = offset.normalize().mult(strength * falloff * snap);

        this.applyForce(force);
        this.boostFrames = max(this.boostFrames, 8);
      }

      update() {
        const anchorOffset = p5.Vector.sub(this.anchor, this.position);
        const distanceFromAnchor = anchorOffset.mag();
        const pull = map(constrain(distanceFromAnchor, 0, min(width, height) * 0.09), 0, min(width, height) * 0.09, 0.032, 0.13);
        const returnForce = anchorOffset.mult(pull * settings.speedScale);

        this.applyForce(returnForce);
        this.velocity.add(this.acceleration);
        const boost = this.boostFrames > 0 ? 1.65 : 1;
        this.velocity.limit(this.baseMaxSpeed * settings.speedScale * boost);
        this.position.add(this.velocity);
        const damping = map(constrain(distanceFromAnchor, 0, min(width, height) * 0.09), 0, min(width, height) * 0.09, 0.78, 0.52);
        this.velocity.mult(this.boostFrames > 0 ? max(0.68, damping) : damping);
        this.acceleration.mult(0);
        this.boostFrames = max(0, this.boostFrames - 1);
      }
    }

    class Particle extends MotionBody {
      constructor(anchor) {
        super(anchor);
        this.baseRadius = random(6, 12);
        this.hueShift = random(1);
        this.rotation = random(TAU);
        this.hasNotch = random() > 0.28;
        this.notchAngle = this.hasNotch ? random(TAU) : 0;
        this.notchWidth = random(0.38, 0.74);
        this.notchDepth = random(0.42, 0.68);
        this.edgeSeed = random(1000);
      }

      draw() {
        const radius = this.baseRadius * settings.sizeScale;
        const pulse = this.hueShift;
        const core = lerpColor(color(90, 173, 128), color(142, 206, 126), pulse);
        const glow = color(red(core), green(core), blue(core), 10);

        noStroke();
        drawingContext.shadowBlur = radius * 0.16;
        drawingContext.shadowColor = glow.toString();
        fill(red(core), green(core), blue(core), 120);
        this.drawPad(radius * 1.03);

        drawingContext.shadowBlur = 0;
        fill(red(core) + 18, green(core) + 18, blue(core) + 6, 196);
        this.drawPad(radius * 0.88);

        drawingContext.shadowBlur = 0;
        stroke(210, 233, 145, 76);
        strokeWeight(max(0.8, radius * 0.035));
        this.drawVeins(radius * 0.78);
        noStroke();
      }

      drawPad(radius) {
        beginShape();

        for (let i = 0; i <= 64; i += 1) {
          const angle = (i / 64) * TAU;
          const diff = abs(atan2(sin(angle - this.notchAngle), cos(angle - this.notchAngle)));
          const notch = this.hasNotch && diff < this.notchWidth
            ? map(diff, 0, this.notchWidth, this.notchDepth, 0)
            : 0;
          const edge = 0.92 + noise(this.edgeSeed, i * 0.18) * 0.16;
          const r = radius * edge * (1 - notch);
          const ovalX = cos(angle) * r * randomPadRatio(this.edgeSeed, 0);
          const ovalY = sin(angle) * r * randomPadRatio(this.edgeSeed, 1);
          const x = this.position.x + ovalX * cos(this.rotation) - ovalY * sin(this.rotation);
          const y = this.position.y + ovalX * sin(this.rotation) + ovalY * cos(this.rotation);

          vertex(x, y);
        }

        endShape(CLOSE);
      }

      drawVeins(radius) {
        const centerAngle = this.notchAngle + PI;
        const center = createVector(this.position.x, this.position.y);

        for (let i = -2; i <= 2; i += 1) {
          const angle = centerAngle + i * 0.36;
          const end = createVector(
            center.x + cos(angle + this.rotation) * radius * 0.72,
            center.y + sin(angle + this.rotation) * radius * 0.72
          );

          line(center.x, center.y, end.x, end.y);
        }
      }
    }

    class LotusFlower extends MotionBody {
      constructor(anchor) {
        super(anchor);
        this.baseRadius = random(7, 11);
        this.rotation = random(TAU);
        this.petals = floor(random(6, 9));
      }

      draw() {
        const radius = this.baseRadius * settings.sizeScale;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        noStroke();
        drawingContext.shadowBlur = radius * 0.7;
        drawingContext.shadowColor = "rgba(255, 144, 190, 0.28)";

        for (let i = 0; i < this.petals; i += 1) {
          const angle = (i / this.petals) * TAU;

          push();
          rotate(angle);
          fill(255, 142, 187, 210);
          ellipse(radius * 0.48, 0, radius * 1.05, radius * 0.42);
          pop();
        }

        drawingContext.shadowBlur = 0;
        fill(255, 198, 219, 235);
        circle(0, 0, radius * 0.72);
        fill(249, 216, 111, 230);
        circle(0, 0, radius * 0.3);
        pop();
      }
    }

    class LotusHalfFlower extends MotionBody {
      constructor(anchor) {
        super(anchor);
        this.baseRadius = random(6.2, 9.4);
        this.rotation = random(TAU);
        this.petals = floor(random(5, 8));
      }

      draw() {
        const radius = this.baseRadius * settings.sizeScale;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        noStroke();
        drawingContext.shadowBlur = radius * 0.42;
        drawingContext.shadowColor = "rgba(255, 145, 190, 0.18)";

        for (let i = 0; i < this.petals; i += 1) {
          const angle = (i / this.petals) * TAU;
          const openSide = cos(angle) > -0.15;
          const petalLength = openSide ? radius * 1.05 : radius * 0.64;
          const petalWidth = openSide ? radius * 0.38 : radius * 0.28;
          const petalAlpha = openSide ? 220 : 165;

          push();
          rotate(angle);
          fill(openSide ? 255 : 244, openSide ? 135 : 102, openSide ? 187 : 162, petalAlpha);
          ellipse(radius * 0.34, 0, petalLength, petalWidth);
          pop();
        }

        drawingContext.shadowBlur = 0;
        fill(255, 190, 216, 238);
        ellipse(0, 0, radius * 0.72, radius * 0.62);
        fill(241, 206, 103, 230);
        circle(0, 0, radius * 0.22);
        pop();
      }
    }

    class LotusBud extends MotionBody {
      constructor(anchor) {
        super(anchor);
        this.baseRadius = random(6.2, 8.8);
        this.rotation = random(TAU);
      }

      draw() {
        const radius = this.baseRadius * settings.sizeScale;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        noStroke();
        drawingContext.shadowBlur = radius * 0.24;
        drawingContext.shadowColor = "rgba(255, 128, 178, 0.16)";

        fill(82, 135, 73, 218);
        ellipse(0, 0, radius * 1.1, radius * 0.92);
        fill(255, 124, 178, 235);
        ellipse(0, 0, radius * 0.88, radius * 0.78);
        fill(255, 170, 204, 226);
        arc(0, 0, radius * 0.9, radius * 0.78, -PI * 0.1, PI * 1.1, CHORD);
        fill(255, 202, 222, 204);
        ellipse(0, -radius * 0.08, radius * 0.42, radius * 0.34);
        pop();
      }

      drawStem() {
        const radius = this.baseRadius * settings.sizeScale;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        noFill();
        drawingContext.shadowBlur = 0;
        stroke(73, 119, 63, 155);
        strokeWeight(max(0.8, radius * 0.1));
        bezier(
          0, radius * 0.36,
          radius * 0.08, radius * 0.74,
          -radius * 0.08, radius * 1.08,
          0, radius * 1.45
        );
        pop();
      }
    }

    class LotusPod extends MotionBody {
      constructor(anchor) {
        super(anchor);
        this.baseRadius = random(5.2, 7.4);
        this.rotation = random(TAU);
        this.seedCount = floor(random(6, 10));
      }

      draw() {
        const radius = this.baseRadius * settings.sizeScale;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        drawingContext.shadowBlur = 0;

        noStroke();
        fill(112, 143, 58, 230);
        ellipse(0, 0, radius * 1.8, radius * 1.35);
        fill(151, 176, 74, 235);
        ellipse(0, -radius * 0.12, radius * 1.42, radius * 1.02);

        fill(56, 91, 45, 140);
        for (let i = 0; i < this.seedCount; i += 1) {
          const angle = (i / this.seedCount) * TAU;
          const ring = i % 2 === 0 ? radius * 0.36 : radius * 0.18;
          circle(cos(angle) * ring, sin(angle) * ring * 0.72, radius * 0.18);
        }
        pop();
      }

      drawStem() {
        const radius = this.baseRadius * settings.sizeScale;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        noFill();
        drawingContext.shadowBlur = 0;
        stroke(69, 111, 69, 150);
        strokeWeight(max(1.2, radius * 0.13));
        bezier(
          -radius * 0.06, radius * 0.32,
          -radius * 0.42, radius * 0.78,
          -radius * 0.28, radius * 1.42,
          -radius * 0.76, radius * 2.08
        );
        stroke(128, 165, 82, 90);
        strokeWeight(max(0.7, radius * 0.05));
        bezier(
          radius * 0.02, radius * 0.28,
          -radius * 0.28, radius * 0.76,
          -radius * 0.12, radius * 1.3,
          -radius * 0.55, radius * 1.96
        );
        pop();
      }
    }

    class KoiFish {
      constructor(index) {
        this.index = index;
        this.position = createVector(width * 0.5, height * 0.5);
        this.velocity = p5.Vector.random2D().mult(random(0.2, 0.8));
        this.size = random(6.6, 9.8);
        this.duckKind = index === 1 || index === 5 ? "white" : index === 9 ? "black" : "yellow";
        this.duckScale = this.duckKind === "white" ? random(1.45, 1.75) : this.duckKind === "black" ? random(1.06, 1.2) : random(0.94, 1.12);
        this.offset = random(0.04, 0.92);
        this.schoolOffset = p5.Vector.random2D().mult(random(24, 78));
        this.roamOffset = p5.Vector.random2D().mult(random(90, 220));
        this.wander = random(1000);
        this.angle = random(TAU);
        this.idleVector = p5.Vector.random2D().mult(random(10, 24));
        this.idleTarget = null;
        this.idleWait = floor(random(20, 90));
        this.idlePhase = random(TAU);
        this.lastMoveAngle = this.angle;
        this.isRoaming = false;
        this.oarPhase = random(TAU);
        this.oarSpeed = 0;
      }

      update() {
        if (koiTrail.length === 0) return;
        const pointerMoving = pointerMoveFrames > 0;
        if (pointerMoving) this.isRoaming = false;
        const settleEase = !pointerMoving ? constrain(pointerSettleFrames / 48, 0, 1) : 1;

        const singleSwimmer = isSingleSwimmerMode();
        const maxLag = singleSwimmer ? 1 : 22;
        const lag = floor(this.offset * min(maxLag, koiTrail.length - 1));
        const trailIndex = max(0, koiTrail.length - 1 - lag);
        const target = koiTrail[trailIndex].copy();
        const groupOffset = singleSwimmer ? createVector(0, 0) : this.schoolOffset;
        const followPoint = p5.Vector.add(target, groupOffset);
        const distanceToFollow = p5.Vector.dist(this.position, followPoint);
        const settling = !pointerMoving && !this.isRoaming && (distanceToFollow > (singleSwimmer ? 7 : 18) || this.velocity.mag() > 0.42);

        if (!pointerMoving && !singleSwimmer && (this.isRoaming || !settling)) {
          if (!this.isRoaming) {
            this.idleWait = 0;
            this.velocity = p5.Vector.fromAngle(this.angle).mult(settings.swimmerMode === 1 ? 0.52 : 0.64);
          }

          this.isRoaming = true;
          this.roamFreely(target);
          return;
        }

        if (!pointerMoving && singleSwimmer && !settling) {
          this.velocity.mult(0);
          this.oarSpeed *= 0.84;
          this.oarPhase += this.oarSpeed;
          return;
        }

        const activeSwim = singleSwimmer
          ? createVector(0, 0)
          : p5.Vector.fromAngle(frameCount * 0.13 + this.wander).mult(this.size * 2.6);
        const targetPoint = pointerMoving
          ? followPoint.copy().add(activeSwim)
          : settling
            ? followPoint.copy()
            : this.updateIdleTarget(target, groupOffset);
        const desired = p5.Vector.sub(targetPoint, this.position);
        const targetDistance = desired.mag();

        const followForce = singleSwimmer ? 6.2 : 3.15;
        const settleForce = singleSwimmer ? 0.64 : 0.42;
        const idleForce = 0.34;
        const forceLimit = pointerMoving
          ? followForce
          : settling
            ? lerp(settleForce, followForce, settleEase)
            : idleForce;

        desired.limit(forceLimit * settings.speedScale);
        this.velocity.add(desired);
        const followSpeed = singleSwimmer ? 11.5 : 9.6;
        const settleSpeed = singleSwimmer ? 2.8 : 0.92;
        const speedLimit = pointerMoving ? followSpeed : lerp(settleSpeed, followSpeed, settleEase);
        this.velocity.limit(speedLimit * settings.speedScale);
        this.position.add(this.velocity);
        const strokeSpeed = this.velocity.mag();
        const settleDamping = singleSwimmer
          ? lerp(0.88, 0.68, settleEase)
          : lerp(0.74, 0.62, settleEase);
        this.velocity.mult(pointerMoving ? 0.62 : settleDamping);

        if (this.shouldUpdateAngle(pointerMoving, targetDistance)) {
          const turnEase = singleSwimmer ? 0.12 : pointerMoving ? 0.24 : 0.16;
          this.angle = easeAngle(this.angle, this.velocity.heading(), turnEase);
        }

        if (singleSwimmer) {
          const targetOarSpeed = strokeSpeed > 0.05 ? map(constrain(strokeSpeed, 0, 7), 0, 7, 0.035, 0.24) : 0;
          this.oarSpeed = lerp(this.oarSpeed, targetOarSpeed, 0.18);
          this.oarPhase += this.oarSpeed;
        }
      }

      roamFreely(baseTarget) {
        const center = p5.Vector.add(baseTarget, this.roamOffset);
        const toCenter = p5.Vector.sub(center, this.position);
        const distanceFromCenter = toCenter.mag();
        const roamLimit = min(width, height) * (settings.swimmerMode === 1 ? 0.55 : 0.48);

        if (this.idleWait > 0) {
          this.idleWait -= 1;
          this.velocity.mult(0.92);
          this.position.add(this.velocity);
          return;
        }

        if (random() < 0.0035) {
          this.idleWait = floor(random(18, 52));
          return;
        }

        const wanderTurn = map(noise(frameCount * 0.011 + this.wander), 0, 1, -0.09, 0.09);
        const returnHeading = toCenter.heading() + sin(frameCount * 0.018 + this.wander) * 0.36;
        const desiredHeading = distanceFromCenter > roamLimit ? returnHeading : this.angle + wanderTurn;
        const turnEase = distanceFromCenter > roamLimit ? 0.08 : 0.032;
        const speedBase = settings.swimmerMode === 1 ? 0.62 : 0.76;
        const speedWave = map(noise(frameCount * 0.009 + this.wander + 90), 0, 1, 0.78, 1.3);

        this.angle = easeAngle(this.angle, desiredHeading, turnEase);
        this.velocity.lerp(p5.Vector.fromAngle(this.angle).mult(speedBase * speedWave * settings.speedScale), 0.085);
        this.position.add(this.velocity);
      }

      updateIdleTarget(baseTarget, groupOffset) {
        const idleCenter = p5.Vector.add(baseTarget, groupOffset);
        const pickTarget = () => {
          const roamRadius = settings.swimmerMode === 1 ? random(84, 168) : random(72, 142);
          const target = idleCenter.copy().add(p5.Vector.random2D().mult(roamRadius));

          if (p5.Vector.dist(this.position, target) < 58) {
            return idleCenter.copy().add(p5.Vector.random2D().mult(roamRadius + 58));
          }

          return target;
        };

        if (!this.idleTarget) {
          this.idleTarget = pickTarget();
        }

        if (p5.Vector.dist(this.position, this.idleTarget) < 22) {
          this.idleWait -= 1;

          if (this.idleWait > 0) {
            return this.position.copy();
          }

          this.idleTarget = pickTarget();
          this.idleWait = floor(random(6, 18));
        }

        return this.idleTarget.copy();
      }

      shouldUpdateAngle(pointerMoving, targetDistance) {
        if (this.velocity.mag() <= 0.08) return false;

        if (isSingleSwimmerMode()) {
          return pointerMoving && targetDistance > 16 && this.velocity.mag() > 2.2;
        }

        return pointerMoving || (targetDistance > 18 && this.velocity.mag() > 0.34);
      }

      draw() {
        if (koiTrail.length === 0) return;
        if (settings.swimmerMode !== 0) return;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.angle);
        noStroke();
        drawingContext.shadowBlur = 0;

        this.drawKoi();
        pop();
      }

      drawSurface() {
        if (koiTrail.length === 0 || settings.swimmerMode === 0) return;
        if (isSingleSwimmerMode() && this.index !== 0) return;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.angle);
        noStroke();
        drawingContext.shadowBlur = 0;

        if (settings.swimmerMode === 1) {
          this.drawDuck();
        } else if (settings.swimmerMode === 3) {
          this.drawPaperPlane();
        } else if (settings.swimmerMode === 4) {
          this.drawRiding();
        } else {
          this.drawBoat();
        }

        pop();
      }

      drawKoi() {
        const wiggle = sin(frameCount * 0.11 + this.wander) * 0.18;

        fill(238, 79, 42, 236);
        ellipse(0, 0, this.size * 2.28, this.size * 1.08);
        fill(255, 129, 61, 242);
        ellipse(this.size * 0.2, 0, this.size * 1.36, this.size * 0.76);

        fill(216, 48, 34, 190);
        triangle(
          -this.size * 1.45, 0,
          -this.size * 2.08, -this.size * (0.62 + wiggle),
          -this.size * 1.92, 0
        );
        triangle(
          -this.size * 1.45, 0,
          -this.size * 2.08, this.size * (0.62 - wiggle),
          -this.size * 1.92, 0
        );

        fill(255, 197, 130, 216);
        ellipse(this.size * -0.26, -this.size * 0.28, this.size * 0.42, this.size * 0.22);
        ellipse(this.size * 0.1, this.size * 0.28, this.size * 0.46, this.size * 0.2);
        fill(42, 30, 24, 228);
        circle(this.size * 0.9, -this.size * 0.2, this.size * 0.12);
        circle(this.size * 0.9, this.size * 0.2, this.size * 0.12);
      }

      drawDuck() {
        const s = this.size * this.duckScale;
        const isWhite = this.duckKind === "white";
        const isBlack = this.duckKind === "black";
        const bob = sin(frameCount * 0.08 + this.wander) * s * 0.025;
        const headBob = sin(frameCount * 0.095 + this.wander) * s * 0.04;

        fill(isWhite ? 238 : isBlack ? 31 : 239, isWhite ? 244 : isBlack ? 34 : 204, isWhite ? 234 : isBlack ? 32 : 67, 240);
        ellipse(0, bob, s * 1.52, s * 1.28);
        if (isWhite) {
          fill(246, 249, 238, 238);
          ellipse(s * 0.62, -s * 0.04 + bob, s * 0.82, s * 0.36);
        }

        fill(isWhite ? 252 : isBlack ? 42 : 250, isWhite ? 252 : isBlack ? 45 : 220, isWhite ? 242 : isBlack ? 42 : 86, 246);
        circle(s * (isWhite ? 0.9 : 0.62), headBob, s * 0.68);

        fill(238, 118, 43, 238);
        triangle(
          s * (isWhite ? 1.18 : 0.92), headBob,
          s * (isWhite ? 1.58 : 1.26), -s * 0.18 + headBob,
          s * (isWhite ? 1.58 : 1.26), s * 0.18 + headBob
        );

        fill(isBlack ? 230 : 44, isBlack ? 230 : 57, isBlack ? 218 : 37, 230);
        circle(s * (isWhite ? 1.02 : 0.74), -s * 0.16 + headBob, s * 0.1);
        fill(isWhite ? 224 : isBlack ? 20 : 224, isWhite ? 231 : isBlack ? 22 : 183, isWhite ? 219 : isBlack ? 20 : 49, 170);
        ellipse(-s * 0.18, bob, s * 0.64, s * 0.72);
      }

      drawBoat() {
        const boatSize = this.size * 6.4;

        fill(75, 48, 32, 245);
        beginShape();
        vertex(boatSize * 1.78, 0);
        bezierVertex(boatSize * 1.1, -boatSize * 0.72, -boatSize * 1.1, -boatSize * 0.72, -boatSize * 1.78, 0);
        bezierVertex(-boatSize * 1.1, boatSize * 0.72, boatSize * 1.1, boatSize * 0.72, boatSize * 1.78, 0);
        endShape(CLOSE);

        fill(142, 92, 52, 238);
        ellipse(0, 0, boatSize * 2.72, boatSize * 0.82);
        fill(194, 139, 78, 224);
        ellipse(boatSize * 0.08, 0, boatSize * 1.76, boatSize * 0.48);

        fill(42, 34, 29, 238);
        rectMode(CENTER);
        rect(0, 0, boatSize * 0.82, boatSize * 0.58, boatSize * 0.14);
        fill(62, 48, 39, 236);
        for (let i = -2; i <= 2; i += 1) {
          rect(i * boatSize * 0.16, 0, boatSize * 0.055, boatSize * 0.56, boatSize * 0.02);
        }

        stroke(82, 53, 37, 210);
        strokeWeight(max(1.2, this.size * 0.18));
        line(-boatSize * 0.96, 0, boatSize * 0.96, 0);

        this.drawBoatOars(boatSize);
      }

      drawPaperPlane() {
        const planeW = this.size * 18.5;
        const planeH = planeW * (paperPlaneImage.height / paperPlaneImage.width);
        const bob = sin(frameCount * 0.045 + this.wander) * this.size * 0.2;

        push();
        rotate(PI + 0.12);
        drawingContext.shadowBlur = this.size * 1.2;
        drawingContext.shadowColor = "rgba(8, 20, 30, 0.28)";
        imageMode(CENTER);
        image(paperPlaneImage, 0, bob, planeW, planeH);
        imageMode(CORNER);
        drawingContext.shadowBlur = 0;
        pop();
      }

      drawRiding() {
        const rideW = this.size * 19.5;
        const rideH = rideW * (ridingImage.height / ridingImage.width);
        const bob = sin(frameCount * 0.052 + this.wander) * this.size * 0.18;

        push();
        rotate(0.04);
        drawingContext.shadowBlur = this.size * 1.2;
        drawingContext.shadowColor = "rgba(8, 20, 30, 0.28)";
        imageMode(CENTER);
        image(ridingImage, 0, bob, rideW, rideH);
        imageMode(CORNER);
        drawingContext.shadowBlur = 0;
        pop();
      }

      getBoatOarGeometry(boatSize) {
        const phase = sin(this.oarPhase) * 0.5 + 0.5;
        const topAngle = lerp(-0.42, -2.08, phase);
        const bottomAngle = lerp(0.42, 2.08, phase);
        const topPivot = createVector(boatSize * 0.62, -boatSize * 0.26);
        const bottomPivot = createVector(boatSize * 0.62, boatSize * 0.26);
        const topTip = p5.Vector.add(topPivot, p5.Vector.fromAngle(topAngle).mult(boatSize * 1.02));
        const bottomTip = p5.Vector.add(bottomPivot, p5.Vector.fromAngle(bottomAngle).mult(boatSize * 1.02));

        return { topPivot, bottomPivot, topTip, bottomTip };
      }

      drawBoatOars(boatSize) {
        const oars = this.getBoatOarGeometry(boatSize);
        const topShaftEnd = p5.Vector.lerp(oars.topPivot, oars.topTip, 0.78);
        const bottomShaftEnd = p5.Vector.lerp(oars.bottomPivot, oars.bottomTip, 0.78);

        drawingContext.shadowBlur = 0;
        strokeCap(ROUND);
        stroke(84, 55, 36, 235);
        strokeWeight(max(2.9, this.size * 0.5));
        line(oars.topPivot.x, oars.topPivot.y, topShaftEnd.x, topShaftEnd.y);
        line(oars.bottomPivot.x, oars.bottomPivot.y, bottomShaftEnd.x, bottomShaftEnd.y);
      }

      drawBoatOarBlades() {
        if (koiTrail.length === 0 || settings.swimmerMode !== 2 || this.index !== 0) return;

        const boatSize = this.size * 6.4;
        const oars = this.getBoatOarGeometry(boatSize);
        const topBladeStart = p5.Vector.lerp(oars.topPivot, oars.topTip, 0.78);
        const bottomBladeStart = p5.Vector.lerp(oars.bottomPivot, oars.bottomTip, 0.78);

        push();
        translate(this.position.x, this.position.y);
        rotate(this.angle);
        drawingContext.shadowBlur = 0;
        strokeCap(ROUND);
        stroke(84, 55, 36, 222);
        strokeWeight(max(2.9, this.size * 0.5));
        line(topBladeStart.x, topBladeStart.y, oars.topTip.x, oars.topTip.y);
        line(bottomBladeStart.x, bottomBladeStart.y, oars.bottomTip.x, oars.bottomTip.y);

        noStroke();
        fill(112, 74, 43, 216);
        ellipse(oars.topTip.x, oars.topTip.y, boatSize * 0.42, boatSize * 0.13);
        ellipse(oars.bottomTip.x, oars.bottomTip.y, boatSize * 0.42, boatSize * 0.13);
        pop();
      }

      getBoatClearancePoints() {
        const boatSize = this.size * 6.4;
        const oars = this.getBoatOarGeometry(boatSize);
        const localPoints = [
          { point: createVector(boatSize * 1.35, 0), radius: 0.082, strength: 3.0 },
          { point: createVector(boatSize * 0.45, -boatSize * 0.42), radius: 0.072, strength: 2.55 },
          { point: createVector(boatSize * 0.45, boatSize * 0.42), radius: 0.072, strength: 2.55 },
          { point: createVector(-boatSize * 0.65, 0), radius: 0.076, strength: 2.65 }
        ];

        const addOarClearance = (pivot, tip) => {
          const points = [
            { t: 0.34, radius: 0.058, strength: 1.95 },
            { t: 0.56, radius: 0.068, strength: 2.25 },
            { t: 0.76, radius: 0.078, strength: 2.6 },
            { t: 0.92, radius: 0.088, strength: 2.95 },
            { t: 1, radius: 0.094, strength: 3.2 }
          ];

          for (const item of points) {
            localPoints.push({
              point: p5.Vector.lerp(pivot, tip, item.t),
              radius: item.radius,
              strength: item.strength
            });
          }
        };

        addOarClearance(oars.topPivot, oars.topTip);
        addOarClearance(oars.bottomPivot, oars.bottomTip);

        return localPoints.map((item) => ({
          point: localToWorld(item.point, this.position, this.angle),
          radius: min(width, height) * item.radius,
          strength: item.strength
        }));
      }
    }

    class Dragonfly {
      constructor() {
        this.position = createVector(random(width), random(height));
        this.velocity = p5.Vector.random2D().mult(random(0.4, 1.1));
        this.size = random(3.6, 5.1);
        this.wander = random(1000);
        this.state = "flying";
        this.target = createVector(random(width), random(height));
        this.perch = null;
        this.restFrames = 0;
        this.angle = random(TAU);
        this.cruiseSpeed = random(2.25, 3.45);
        this.turnEase = random(0.035, 0.06);
      }

      update() {
        if (this.state === "resting") {
          if (!this.perch) {
            this.startFlight();
            return;
          }

          this.position = p5.Vector.lerp(this.position, this.perch.position, 0.18);
          this.velocity.mult(0);
          this.restFrames -= 1;

          if (this.restFrames <= 0) {
            this.startFlight();
          }

          return;
        }

        if (p5.Vector.dist(this.position, this.target) < 18 || random() < 0.008) {
          this.pickFlightTarget();
        }

        if (random() < 0.006) {
          this.tryLanding();
        }

        const desired = p5.Vector.sub(this.target, this.position);
        const distance = desired.mag();

        if (distance > 0.001) {
          desired.setMag(this.cruiseSpeed);
          this.velocity.lerp(desired, this.turnEase);
        }

        const slightAir = p5.Vector.random2D().mult(0.018);
        this.velocity.add(slightAir);
        this.velocity.limit(this.cruiseSpeed * 1.12);
        this.position.add(this.velocity);
        this.wrap();

        if (this.velocity.mag() > 0.05) {
          this.angle = this.velocity.heading();
        }
      }

      draw() {
        push();
        translate(this.position.x, this.position.y);
        rotate(this.angle);
        drawingContext.shadowBlur = 0;
        stroke(38, 70, 66, 230);
        strokeWeight(max(0.8, this.size * 0.16));
        line(-this.size * 1.2, 0, this.size * 1.2, 0);

        noStroke();
        fill(111, 215, 214, this.state === "resting" ? 116 : 84);
        ellipse(-this.size * 0.2, -this.size * 0.55, this.size * 1.75, this.size * 0.42);
        ellipse(-this.size * 0.2, this.size * 0.55, this.size * 1.75, this.size * 0.42);
        fill(159, 232, 216, this.state === "resting" ? 98 : 64);
        ellipse(this.size * 0.42, -this.size * 0.48, this.size * 1.45, this.size * 0.34);
        ellipse(this.size * 0.42, this.size * 0.48, this.size * 1.45, this.size * 0.34);

        fill(35, 58, 54, 240);
        ellipse(this.size * 1.08, 0, this.size * 0.44, this.size * 0.34);
        pop();
      }

      pickFlightTarget() {
        this.target = createVector(random(width * 0.04, width * 0.96), random(height * 0.04, height * 0.96));
      }

      tryLanding() {
        const perches = particles.concat(flowers, halfFlowers, buds, pods);

        if (perches.length === 0) return;

        this.perch = random(perches);
        this.state = "resting";
        this.restFrames = floor(random(70, 180));
      }

      startFlight() {
        this.state = "flying";
        this.perch = null;
        this.pickFlightTarget();
      }

      wrap() {
        if (this.position.x < -20) this.position.x = width + 20;
        if (this.position.x > width + 20) this.position.x = -20;
        if (this.position.y < -20) this.position.y = height + 20;
        if (this.position.y > height + 20) this.position.y = -20;
      }
    }

    class Frog {
      constructor() {
        this.size = random(7.8, 10.6);
        this.state = "perched";
        this.perch = null;
        this.position = createVector(width * 0.5, height * 0.5);
        this.start = this.position.copy();
        this.target = this.position.copy();
        this.progress = 0;
        this.restFrames = floor(random(120, 300));
        this.hiddenFrames = 0;
        this.angle = random(TAU);
        this.offset = p5.Vector.random2D().mult(random(0, 5));
        this.splashed = false;
        this.pickPerch(true);
      }

      update() {
        if (this.state === "perched") {
          if (!this.perch) {
            this.pickPerch(true);
            return;
          }

          this.position = p5.Vector.add(this.perch.position, this.offset);
          this.restFrames -= 1;

          if (this.restFrames <= 0 && random() < 0.035) {
            this.startDive();
          }

          return;
        }

        if (this.state === "diving") {
          this.progress += 0.045;
          this.position = this.jumpPosition(this.start, this.target, this.progress, -36);

          if (!this.splashed && this.progress > 0.68) {
            addFrogSplash(this.target);
            this.splashed = true;
          }

          if (this.progress >= 1) {
            this.state = "hidden";
            this.hiddenFrames = floor(random(80, 170));
          }

          return;
        }

        if (this.state === "hidden") {
          this.hiddenFrames -= 1;

          if (this.hiddenFrames <= 0) {
            this.startReturn();
          }

          return;
        }

        if (this.state === "returning") {
          this.progress += 0.038;
          this.position = this.jumpPosition(this.start, this.target, this.progress, -42);

          if (this.progress >= 1) {
            this.state = "perched";
            this.position = this.target.copy();
            this.restFrames = floor(random(150, 340));
          }
        }
      }

      draw() {
        if (this.state === "hidden") return;

        const bodyScale = this.state === "diving"
          ? map(constrain(this.progress, 0, 1), 0, 1, 1, 0.55)
          : 1;
        const alpha = this.state === "diving"
          ? map(constrain(this.progress, 0, 1), 0, 1, 235, 70)
          : 235;

        push();
        translate(this.position.x, this.position.y);
        rotate(this.angle);
        scale(bodyScale);
        drawingContext.shadowBlur = 0;
        noStroke();

        fill(37, 90, 48, alpha);
        ellipse(0, 0, this.size * 1.45, this.size * 1.08);
        fill(65, 132, 66, alpha);
        ellipse(this.size * 0.18, -this.size * 0.08, this.size * 1.04, this.size * 0.82);

        fill(31, 69, 38, alpha * 0.86);
        ellipse(this.size * 0.52, -this.size * 0.35, this.size * 0.38, this.size * 0.28);
        ellipse(this.size * 0.52, this.size * 0.35, this.size * 0.38, this.size * 0.28);

        fill(21, 40, 27, alpha);
        circle(this.size * 0.62, -this.size * 0.37, this.size * 0.11);
        circle(this.size * 0.62, this.size * 0.37, this.size * 0.11);

        stroke(33, 79, 43, alpha * 0.78);
        strokeWeight(max(0.7, this.size * 0.08));
        line(-this.size * 0.45, -this.size * 0.32, -this.size * 0.92, -this.size * 0.72);
        line(-this.size * 0.45, this.size * 0.32, -this.size * 0.92, this.size * 0.72);
        pop();
      }

      jumpPosition(from, to, t, heightOffset) {
        const clamped = constrain(t, 0, 1);
        const arc = sin(clamped * PI) * heightOffset;
        const point = p5.Vector.lerp(from, to, clamped);

        point.y += arc;
        return point;
      }

      startDive() {
        this.state = "diving";
        this.start = this.position.copy();
        const jump = p5.Vector.random2D().mult(random(10, 24));
        this.target = createVector(
          constrain(this.position.x + jump.x, width * 0.035, width * 0.965),
          constrain(this.position.y + jump.y, height * 0.035, height * 0.965)
        );
        this.progress = 0;
        this.splashed = false;
        this.angle = p5.Vector.sub(this.target, this.start).heading();
      }

      startReturn() {
        this.pickPerch(false, this.position);
        this.state = "returning";
        this.start = this.position.copy();
        this.target = p5.Vector.add(this.perch.position, this.offset);
        this.progress = 0;
        this.angle = p5.Vector.sub(this.target, this.start).heading();
      }

      pickPerch(resetPosition, nearPoint = null) {
        if (particles.length === 0) return;

        if (nearPoint) {
          const nearby = particles
            .filter((particle) => p5.Vector.dist(particle.position, nearPoint) < min(width, height) * 0.24);
          this.perch = nearby.length > 0 ? random(nearby) : random(particles);
        } else {
          this.perch = random(particles);
        }

        this.offset = p5.Vector.random2D().mult(random(0, this.perch.baseRadius * settings.sizeScale * 0.32));
        this.target = p5.Vector.add(this.perch.position, this.offset);

        if (resetPosition) {
          this.position = this.target.copy();
        }
      }
    }

    function preload() {
      paperPlaneImage = loadImage("assets/paper-plane.gif");
      ridingImage = loadImage("assets/riding.gif");
    }

    function isSingleSwimmerMode() {
      return settings.swimmerMode === 2 || settings.swimmerMode === 3 || settings.swimmerMode === 4;
    }

    function setup() {
      const holder = document.getElementById("sketch");
      const sketchWidth = Math.floor(holder.clientWidth);
      const sketchHeight = Math.floor(sketchWidth / CANVAS_RATIO);
      const canvas = createCanvas(sketchWidth, sketchHeight);

      canvas.parent(holder);
      pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      colorMode(RGB, 255, 255, 255, 255);
      setupControls();
      createParticles();
      createFlowers();
      createHalfFlowers();
      createBuds();
      createPods();
      createKoi();
      createFrogs();
      createDragonflies();
      createSceneClouds();
      createNoiseLayer();
    }

    function draw() {
      drawWaterBackground();
      updateKoiTrail();
      pointerMoveFrames = max(0, pointerMoveFrames - 1);
      pointerSettleFrames = pointerMoveFrames > 0 ? 48 : max(0, pointerSettleFrames - 1);

      for (const fish of koi) {
        fish.update();
      }

      applyKoiForces();
      applyFrogSplashes();

      for (const fish of koi) {
        fish.draw();
      }

      for (const fish of koi) {
        fish.drawBoatOarBlades();
      }

      for (const pod of pods) {
        pod.update();
        pod.drawStem();
      }

      for (const bud of buds) {
        bud.update();
        bud.drawStem();
      }

      for (const particle of particles) {
        particle.update();
        particle.draw();
      }

      for (const pod of pods) {
        pod.draw();
      }

      for (const flower of flowers) {
        flower.update();
        flower.draw();
      }

      for (const halfFlower of halfFlowers) {
        halfFlower.update();
        halfFlower.draw();
      }

      for (const bud of buds) {
        bud.draw();
      }

      for (const frog of frogs) {
        frog.update();
        frog.draw();
      }

      for (const fish of koi) {
        fish.drawSurface();
      }

      for (const dragonfly of dragonflies) {
        dragonfly.update();
        dragonfly.draw();
      }

      image(noiseLayer, 0, 0, width, height);
      drawSceneLightOverlay();
    }

    function createParticles() {
      particles.length = 0;

      for (let i = 0; i < settings.count; i += 1) {
        particles.push(new Particle(createTiledAnchor(i)));
      }
    }

    function createFlowers() {
      flowers.length = 0;
      const flowerCount = max(4, floor(settings.count * 0.055));

      for (let i = 0; i < flowerCount; i += 1) {
        const anchorIndex = floor(random(particles.length));
        const base = particles[anchorIndex].anchor;
        const offset = p5.Vector.random2D().mult(random(4, 16));
        const anchor = createVector(
          constrain(base.x + offset.x, width * 0.04, width * 0.96),
          constrain(base.y + offset.y, height * 0.04, height * 0.96)
        );

        flowers.push(new LotusFlower(anchor));
      }
    }

    function createHalfFlowers() {
      halfFlowers.length = 0;
      const halfFlowerCount = max(2, floor(flowers.length * 0.54));

      for (let i = 0; i < halfFlowerCount; i += 1) {
        const anchor = createPlantAnchor(5, 17);

        halfFlowers.push(new LotusHalfFlower(anchor));
      }
    }

    function createBuds() {
      buds.length = 0;
      const budCount = max(1, floor(flowers.length * 0.34));

      for (let i = 0; i < budCount; i += 1) {
        const anchor = createPlantAnchor(4, 15);

        buds.push(new LotusBud(anchor));
      }
    }

    function createPods() {
      pods.length = 0;
      const podCount = max(2, floor(flowers.length * 0.46));

      for (let i = 0; i < podCount; i += 1) {
        const anchor = createPlantAnchor(5, 18);

        pods.push(new LotusPod(anchor));
      }
    }

    function createKoi() {
      koi.length = 0;

      for (let i = 0; i < 13; i += 1) {
        koi.push(new KoiFish(i));
      }
    }

    function createFrogs() {
      frogs.length = 0;
      const frogCount = max(1, floor(pods.length * 0.55));

      for (let i = 0; i < frogCount; i += 1) {
        frogs.push(new Frog());
      }
    }

    function createDragonflies() {
      dragonflies.length = 0;

      for (let i = 0; i < 6; i += 1) {
        dragonflies.push(new Dragonfly());
      }
    }

    function createTiledAnchor(index) {
      const slotFactor = map(settings.overlapScale, 0.75, 1.65, 1.48, 0.56);
      const slotCount = max(12, floor(settings.count * slotFactor));
      const columns = ceil(sqrt(slotCount * CANVAS_RATIO));
      const rows = ceil(slotCount / columns);
      const cellW = width / columns;
      const cellH = height / rows;
      const slot = floor(index * slotCount / settings.count) % slotCount;
      const col = slot % columns;
      const row = floor(slot / columns);
      const jitterAmount = map(settings.overlapScale, 0.75, 1.65, 0.18, 0.43);
      const jitterX = random(-jitterAmount, jitterAmount) * cellW;
      const jitterY = random(-jitterAmount, jitterAmount) * cellH;
      const x = (col + 0.5) * cellW + jitterX;
      const y = (row + 0.5) * cellH + jitterY;

      return createVector(
        constrain(x, width * 0.035, width * 0.965),
        constrain(y, height * 0.035, height * 0.965)
      );
    }

    function createPlantAnchor(minOffset, maxOffset) {
      const anchorIndex = floor(random(particles.length));
      const base = particles[anchorIndex].anchor;
      const offset = p5.Vector.random2D().mult(random(minOffset, maxOffset));

      return createVector(
        constrain(base.x + offset.x, width * 0.04, width * 0.96),
        constrain(base.y + offset.y, height * 0.04, height * 0.96)
      );
    }

    function easeAngle(current, target, amount) {
      const delta = atan2(sin(target - current), cos(target - current));

      return current + delta * amount;
    }

    function localToWorld(point, origin, angle) {
      return createVector(
        origin.x + point.x * cos(angle) - point.y * sin(angle),
        origin.y + point.x * sin(angle) + point.y * cos(angle)
      );
    }

    function isPointerInsideCanvas() {
      return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
    }

    function mouseMoved() {
      pointerHasEntered = true;
      pointerMoveFrames = 8;
      pointerSettleFrames = 48;
      pushPointerSegment(pmouseX, pmouseY, mouseX, mouseY, false);
    }

    function mousePressed() {
      pointerHasEntered = true;
      pointerMoveFrames = 8;
      pointerSettleFrames = 48;
      pushPointerSegment(pmouseX, pmouseY, mouseX, mouseY, true);
    }

    function mouseDragged() {
    }

    function mouseReleased() {
    }

    function touchMoved() {
      pointerHasEntered = true;
      pointerMoveFrames = 8;
      pointerSettleFrames = 48;
      pushPointerSegment(pmouseX, pmouseY, mouseX, mouseY, false);
      return false;
    }

    function pushPointerSegment(fromX, fromY, toX, toY, isClick) {
      if (!isPointerInsideCanvas()) return;

      const start = createVector(
        constrain(fromX, 0, width),
        constrain(fromY, 0, height)
      );
      const end = createVector(toX, toY);
      const distance = p5.Vector.dist(start, end);
      const spacing = min(width, height) * 0.035;
      const steps = max(1, ceil(distance / spacing));

      for (let i = 0; i <= steps; i += 1) {
        const point = p5.Vector.lerp(start, end, i / steps);
        pushPointerForce(point, isClick ? 1.05 : 0.52, isClick ? 10 : 3, isClick);
      }
    }

    function pushPointerForce(point, strength, life, isClick) {
      return;

      pointerForces.push({
        point,
        strength,
        radius: min(width, height) * (isClick ? 0.18 : 0.105),
        life,
        maxLife: life
      });

      if (pointerForces.length > 90) {
        pointerForces.splice(0, pointerForces.length - 90);
      }
    }

    function applyKoiForces() {
      if (koiTrail.length === 0) return;

      for (const fish of koi) {
        const singleSwimmer = isSingleSwimmerMode();
        if (singleSwimmer && fish.index !== 0) continue;

        if (singleSwimmer) {
          for (const clearance of fish.getBoatClearancePoints()) {
            repelPlantsFrom(clearance.point, clearance.strength, clearance.radius);
          }

          continue;
        }

        const duckClearance = settings.swimmerMode === 1 ? fish.duckScale : 1;
        const radius = min(width, height) * (singleSwimmer ? 0.135 : settings.swimmerMode === 1 ? 0.132 * duckClearance : 0.105);
        const strengthScale = singleSwimmer ? 1.18 : settings.swimmerMode === 1 ? 1.22 * duckClearance : 1;

        repelPlantsFrom(fish.position, 2.35 * strengthScale, radius);
      }
    }

    function repelPlantsFrom(point, strength, radius) {
      for (const particle of particles) {
        particle.repelFrom(point, strength, radius);
      }

      for (const flower of flowers) {
        flower.repelFrom(point, strength * 0.51, radius * 0.88);
      }

      for (const halfFlower of halfFlowers) {
        halfFlower.repelFrom(point, strength * 0.46, radius * 0.86);
      }

      for (const bud of buds) {
        bud.repelFrom(point, strength * 0.41, radius * 0.82);
      }

      for (const pod of pods) {
        pod.repelFrom(point, strength * 0.48, radius * 0.84);
      }
    }

    function addFrogSplash(point) {
      frogSplashes.push({
        point: point.copy(),
        life: 18,
        maxLife: 18
      });
    }

    function applyFrogSplashes() {
      for (let i = frogSplashes.length - 1; i >= 0; i -= 1) {
        const splash = frogSplashes[i];
        const progress = 1 - splash.life / splash.maxLife;
        const radius = min(width, height) * lerp(0.13, 0.28, progress);
        const strength = 3.75 * (1 - progress * 0.55);

        for (const particle of particles) {
          particle.repelFrom(splash.point, strength * 1.42, radius);
        }

        for (const flower of flowers) {
          flower.repelFrom(splash.point, strength * 0.84, radius * 0.9);
        }

        for (const halfFlower of halfFlowers) {
          halfFlower.repelFrom(splash.point, strength * 0.78, radius * 0.86);
        }

        for (const bud of buds) {
          bud.repelFrom(splash.point, strength * 0.68, radius * 0.82);
        }

        for (const pod of pods) {
          pod.repelFrom(splash.point, strength * 0.78, radius * 0.84);
        }

        splash.life -= 1;

        if (splash.life <= 0) {
          frogSplashes.splice(i, 1);
        }
      }
    }

    function updateKoiTrail() {
      if (!pointerHasEntered || !isPointerInsideCanvas()) return;

      const pointer = createVector(mouseX, mouseY);

      if (koiTrail.length === 0) {
        for (const fish of koi) {
          const offset = p5.Vector.add(
            fish.schoolOffset,
            p5.Vector.random2D().mult(random(4, 18))
          );

          fish.position = p5.Vector.add(pointer, offset);
          fish.velocity.mult(0);
        }
      }

      koiTrail.push(pointer);

      if (koiTrail.length > 150) {
        koiTrail.shift();
      }
    }

    function drawWaterBackground() {
      const palette = scenePalette[settings.sceneMode];
      updateSceneClouds();
      background(...palette.skyBottom);
      noStroke();

      for (let y = 0; y < height; y += 10) {
        const t = y / height;
        const wave = sin(frameCount * 0.008 + y * 0.018 + settings.sceneMode * 0.9) * (settings.sceneMode === 2 ? 7 : 4);
        const waterAlpha = settings.sceneMode === 2 ? 96 : settings.sceneMode === 0 ? 82 : 88;
        fill(
          lerp(palette.waterTop[0], palette.waterBottom[0], t),
          lerp(palette.waterTop[1], palette.waterBottom[1], t),
          lerp(palette.waterTop[2], palette.waterBottom[2], t),
          waterAlpha
        );
        rect(wave, y, width, 10);
      }

      for (let y = 0; y < height * 0.58; y += 10) {
        const t = y / (height * 0.58);
        const skyShift = sin(frameCount * 0.004 + y * 0.012 + settings.sceneMode) * (settings.sceneMode === 1 ? 2 : 5);
        fill(
          lerp(palette.skyTop[0], palette.skyBottom[0], t),
          lerp(palette.skyTop[1], palette.skyBottom[1], t),
          lerp(palette.skyTop[2], palette.skyBottom[2], t),
          72
        );
        rect(skyShift, y, width, 10);
      }

      for (let i = 0; i < 9; i += 1) {
        const x = width * noise(i * 2.4, 17);
        const y = height * noise(i * 1.8, 41);
        const r = width * (0.22 + noise(i, 73) * 0.18);
        const pulse = 0.75 + sin(frameCount * 0.01 + i + settings.sceneMode) * (settings.sceneMode === 3 ? 0.04 : 0.12);

        fill(...palette.wash, settings.sceneMode === 3 ? 10 + i : 12 + i);
        ellipse(x, y + sin(frameCount * 0.008 + i + settings.sceneMode) * (settings.sceneMode === 2 ? 4 : 3), r * pulse, r * 0.56 * pulse);
      }

      if (settings.sceneMode === 3) {
        drawNightSkyElements();
      }
    }

    function createSceneClouds() {
      sceneClouds.length = 0;
      const count = settings.sceneMode === 3 ? 7 : 5;

      for (let i = 0; i < count; i += 1) {
        sceneClouds.push({
          x: random(width * 0.05, width * 0.95),
          y: random(height * 0.05, height * 0.34),
          w: random(width * 0.18, width * 0.42),
          h: random(height * 0.045, height * 0.11),
          speed: random(0.46, 0.92) * (random() > 0.5 ? 1 : -1),
          phase: random(TAU),
          seed: random(1000)
        });
      }
    }

    function updateSceneClouds() {
      for (const cloud of sceneClouds) {
        cloud.x += cloud.speed * (settings.sceneMode === 3 ? 1.18 : 0.68);
        if (cloud.x < -cloud.w) cloud.x = width + cloud.w;
        if (cloud.x > width + cloud.w) cloud.x = -cloud.w;
      }
    }

    function sceneCloudState(cloud) {
      const cloudNoise = noise(frameCount * 0.012 + cloud.seed, cloud.phase);
      const driftX = sin(frameCount * 0.018 + cloud.phase) * (settings.sceneMode === 3 ? 52 : 24);
      const driftY = sin(frameCount * 0.01 + cloud.phase) * (settings.sceneMode === 3 ? 16 : 7);

      return {
        x: cloud.x + driftX,
        y: cloud.y + driftY,
        w: cloud.w * lerp(0.82, 1.26, cloudNoise),
        h: cloud.h * lerp(0.9, 1.18, cloudNoise),
        alpha: cloudNoise
      };
    }

    function drawNightSkyElements() {
      const palette = scenePalette[3];
      const moonX = width * 0.72;
      const moonY = height * 0.18;
      const moonR = min(width, height) * 0.08;
      const waterY = height * 0.54;
      const waterMoonY = waterY + moonR * 0.72;

      for (const cloud of sceneClouds) {
        const state = sceneCloudState(cloud);
        const alpha = 78 + state.alpha * 56;
        const y = waterMoonY + (state.y - moonY) * 0.32;
        const x = state.x;
        const w = state.w;
        const h = state.h;

        fill(12, 22, 40, alpha);
        ellipse(x, y, w, h);
        ellipse(x - w * 0.28, y + 6, w * 0.62, h * 0.82);
        ellipse(x + w * 0.24, y - 3, w * 0.68, h * 0.76);
      }

      drawMoonReflection(moonX, moonY, moonR, palette);
    }

    function drawMoonReflection(moonX, moonY, moonR, palette) {
      const waterY = height * 0.52;
      const reflectionX = moonX + sin(frameCount * 0.01) * moonR * 0.12;
      const reflectionBaseY = waterY + moonR * 0.78;
      const cloudMask = getMoonCloudMask(moonX, moonY, moonR);
      const reflectionH = moonR * 2.5;

      noStroke();
      for (let i = 0; i < 4; i += 1) {
        const stretch = 1 - i * 0.16;
        fill(...palette.moon, (50 - i * 6) * cloudMask);
        ellipse(reflectionX, reflectionBaseY + i * 10, moonR * 0.5 * stretch, reflectionH * 0.52 * stretch);
      }

      for (const cloud of sceneClouds) {
        const state = sceneCloudState(cloud);
        const reflectedY = reflectionBaseY + (state.y - moonY) * 0.42;
        const cloudTouch = constrain(
          1 - dist(state.x, state.y, moonX, moonY) / (moonR * 4.2),
          0,
          1
        );
        if (cloudTouch <= 0) continue;

        fill(10, 17, 31, 118 * cloudTouch);
        ellipse(
          reflectionX + (state.x - moonX) * 0.52,
          reflectedY,
          state.w * 0.46,
          state.h * 0.58
        );
      }
    }

    function getMoonCloudMask(moonX, moonY, moonR) {
      let cover = 0;

      for (const cloud of sceneClouds) {
        const state = sceneCloudState(cloud);
        const reach = max(state.w * 0.54, moonR * 2.6);
        const overlap = constrain(1 - dist(state.x, state.y, moonX, moonY) / reach, 0, 1);
        cover = max(cover, overlap * (0.72 + state.alpha * 0.28));
      }

      return lerp(1, 0.34, cover);
    }

    function drawSceneLightOverlay() {
      blendMode(SCREEN);
      noStroke();

      if (settings.sceneMode === 0) {
        drawMorningMistOverlay();
      } else if (settings.sceneMode === 1) {
        drawNoonSunOverlay();
      } else if (settings.sceneMode === 2) {
        drawDuskGlowOverlay();
      } else {
        drawNightMoonOverlay();
      }

      blendMode(BLEND);
    }

    function drawMorningMistOverlay() {
      const drift = frameCount * 0.54;

      for (let i = 0; i < 7; i += 1) {
        const x = (width * noise(i * 7.2, 13) + drift * (0.75 + i * 0.12)) % (width + 260) - 130;
        const y = height * (0.1 + i * 0.115) + sin(frameCount * 0.014 + i) * 22;
        const alpha = 18 + sin(frameCount * 0.012 + i * 1.7) * 7;

        fill(218, 250, 238, alpha);
        ellipse(x, y, width * 0.86, height * 0.12);
      }

      fill(235, 255, 238, 24 + sin(frameCount * 0.01) * 5);
      rect(0, 0, width, height);
    }

    function drawNoonSunOverlay() {
      const pulse = 0.82 + sin(frameCount * 0.018) * 0.08;
      const sunX = width * 0.28;
      const sunY = height * 0.18;

      fill(255, 248, 188, 34 * pulse);
      ellipse(sunX, sunY, width * 0.95, width * 0.95);

      fill(248, 255, 220, 18);
      rect(0, 0, width, height);

      for (let i = 0; i < 8; i += 1) {
        const y = height * (0.14 + i * 0.095);
        const x = (frameCount * (0.22 + i * 0.018) + i * 89) % (width + 120) - 60;

        fill(252, 255, 220, 12 + sin(frameCount * 0.02 + i) * 5);
        ellipse(x, y, width * 0.28, height * 0.018);
      }
    }

    function drawDuskGlowOverlay() {
      const glowX = width * 0.18;
      const glowY = height * 0.68 + sin(frameCount * 0.01) * 8;

      fill(255, 132, 82, 38);
      ellipse(glowX, glowY, width * 1.2, height * 0.62);
      fill(255, 194, 128, 24 + sin(frameCount * 0.014) * 6);
      ellipse(width * 0.38, height * 0.48, width * 1.1, height * 0.42);

      blendMode(MULTIPLY);
      fill(70, 25, 75, 28);
      rect(0, 0, width, height);
      blendMode(SCREEN);
    }

    function drawNightMoonOverlay() {
      const moonX = width * 0.72;
      const moonY = height * 0.18;
      const moonR = min(width, height) * 0.08;
      const cloudMask = getMoonCloudMask(moonX, moonY, moonR);
      const alpha = 28 + cloudMask * 38;

      fill(178, 210, 255, alpha);
      ellipse(moonX, height * 0.56, width * 0.72, height * 0.42);

      fill(194, 222, 255, 16 + cloudMask * 20);
      rect(0, 0, width, height);

      blendMode(MULTIPLY);
      for (const cloud of sceneClouds) {
        const state = sceneCloudState(cloud);
        const reflectedY = height * 0.58 + (state.y - moonY) * 0.62;

        fill(3, 13, 28, 22 + state.alpha * 42);
        ellipse(state.x, reflectedY, state.w * 1.02, state.h * 1.02);
        ellipse(state.x - state.w * 0.28, reflectedY + 7, state.w * 0.66, state.h * 0.82);
        ellipse(state.x + state.w * 0.32, reflectedY - 5, state.w * 0.72, state.h * 0.78);
      }
      blendMode(SCREEN);
    }

    function applyPointerTrailForces() {
      for (let i = pointerForces.length - 1; i >= 0; i -= 1) {
        const pointerForce = pointerForces[i];
        const ageScale = pointerForce.life / pointerForce.maxLife;

        for (const particle of particles) {
          particle.repelFrom(
            pointerForce.point,
            pointerForce.strength * ageScale,
            pointerForce.radius
          );
        }

        for (const flower of flowers) {
          flower.repelFrom(
            pointerForce.point,
            pointerForce.strength * ageScale,
            pointerForce.radius
          );
        }

        for (const halfFlower of halfFlowers) {
          halfFlower.repelFrom(
            pointerForce.point,
            pointerForce.strength * ageScale,
            pointerForce.radius
          );
        }

        for (const bud of buds) {
          bud.repelFrom(
            pointerForce.point,
            pointerForce.strength * ageScale,
            pointerForce.radius
          );
        }

        for (const pod of pods) {
          pod.repelFrom(
            pointerForce.point,
            pointerForce.strength * ageScale,
            pointerForce.radius
          );
        }

        pointerForce.life -= 1;

        if (pointerForce.life <= 0) {
          pointerForces.splice(i, 1);
        }
      }
    }

    function windowResized() {
      const holder = document.getElementById("sketch");
      const sketchWidth = Math.floor(holder.clientWidth);
      const sketchHeight = Math.floor(sketchWidth / CANVAS_RATIO);

      resizeCanvas(sketchWidth, sketchHeight);
      createParticles();
      createFlowers();
      createHalfFlowers();
      createBuds();
      createPods();
      createKoi();
      createFrogs();
      createDragonflies();
      createSceneClouds();
      koiTrail.length = 0;
      frogSplashes.length = 0;
      createNoiseLayer();
    }

    function setupControls() {
      const countControl = document.getElementById("countControl");
      const sizeControl = document.getElementById("sizeControl");
      const speedControl = document.getElementById("speedControl");
      const spreadControl = document.getElementById("spreadControl");
      const swimmerControl = document.getElementById("swimmerControl");
      const sceneControl = document.getElementById("sceneControl");
      const countValue = document.getElementById("countValue");
      const sizeValue = document.getElementById("sizeValue");
      const speedValue = document.getElementById("speedValue");
      const spreadValue = document.getElementById("spreadValue");
      const swimmerValue = document.getElementById("swimmerValue");
      const sceneValue = document.getElementById("sceneValue");

      const updateSwimmerLabel = () => {
        swimmerControl.textContent = swimmerModes[settings.swimmerMode];
        swimmerValue.value = `${settings.swimmerMode + 1}/${swimmerModes.length}`;
      };

      const updateSceneLabel = () => {
        sceneControl.textContent = sceneModes[settings.sceneMode];
        sceneValue.value = `${settings.sceneMode + 1}/4`;
        createSceneClouds();
      };

      countControl.addEventListener("input", () => {
        settings.count = Number(countControl.value);
        countValue.value = settings.count;
        createParticles();
        createFlowers();
        createHalfFlowers();
        createBuds();
        createPods();
        createFrogs();
        createDragonflies();
      });

      sizeControl.addEventListener("input", () => {
        settings.sizeScale = Number(sizeControl.value) / 100;
        sizeValue.value = `${sizeControl.value}%`;
      });

      speedControl.addEventListener("input", () => {
        settings.speedScale = Number(speedControl.value) / 100;
        speedValue.value = `${speedControl.value}%`;
      });

      spreadControl.addEventListener("input", () => {
        settings.overlapScale = Number(spreadControl.value) / 100;
        spreadValue.value = `${spreadControl.value}%`;
        createParticles();
        createFlowers();
        createHalfFlowers();
        createBuds();
        createPods();
        createFrogs();
        createDragonflies();
      });

      swimmerControl.addEventListener("click", () => {
        settings.swimmerMode = (settings.swimmerMode + 1) % swimmerModes.length;

        if (isSingleSwimmerMode() && koiTrail.length > 0 && koi.length > 0) {
          const pointer = koiTrail[koiTrail.length - 1].copy();

          koi[0].position = pointer;
          koi[0].velocity.mult(0);
        }

        updateSwimmerLabel();
      });

      sceneControl.addEventListener("click", () => {
        settings.sceneMode = (settings.sceneMode + 1) % sceneModes.length;
        updateSceneLabel();
      });

      updateSwimmerLabel();
      updateSceneLabel();
    }

    function randomPadRatio(seed, axis) {
      return axis === 0
        ? 0.94 + noise(seed, 41) * 0.16
        : 0.84 + noise(seed, 73) * 0.22;
    }

    function createNoiseLayer() {
      noiseLayer = createGraphics(width, height);
      noiseLayer.pixelDensity(1);
      noiseLayer.loadPixels();

      for (let i = 0; i < noiseLayer.pixels.length; i += 4) {
        const shade = random(185, 255);
        const alpha = random(0, 18);

        noiseLayer.pixels[i] = shade;
        noiseLayer.pixels[i + 1] = shade;
        noiseLayer.pixels[i + 2] = shade;
        noiseLayer.pixels[i + 3] = alpha;
      }

      noiseLayer.updatePixels();
    }

  
