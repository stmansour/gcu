/**
 * MotorEngine — Chapter 4 gear-ratio and load evaluator.
 *
 * The model is deliberately simple, but mechanically honest:
 *   - gear ratio = driven teeth / driver teeth
 *   - output speed = motor speed / ratio
 *   - output torque = motor torque * ratio
 *   - stress rises when required load torque approaches available torque
 */

export const MOTOR_POWER = {
  low:    { id: 'low',    label: 'Low',    volts: 3, torque: 0.55, speed: 0.55 },
  medium: { id: 'medium', label: 'Medium', volts: 6, torque: 1.00, speed: 1.00 },
  high:   { id: 'high',   label: 'High',   volts: 9, torque: 1.55, speed: 1.42 },
};

export const ARM_LOAD = {
  light:  { id: 'light',  label: 'Light',  torqueNeeded: 0.75, weightKg: 1.0, weightLabel: 'foam block' },
  medium: { id: 'medium', label: 'Medium', torqueNeeded: 1.65, weightKg: 3.0, weightLabel: 'tool pack'  },
  heavy:  { id: 'heavy',  label: 'Heavy',  torqueNeeded: 2.75, weightKg: 6.0, weightLabel: 'battery'    },
};

export const GEAR_SET = {
  fast: {
    id: 'fast',
    label: 'Fast',
    ratioLabel: '1:1',
    driverTeeth: 24,
    drivenTeeth: 24,
    maxTorqueNm: 1.5,
    description: 'Same-size gears. One motor turn gives one arm gear turn.',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    ratioLabel: '3:1',
    driverTeeth: 12,
    drivenTeeth: 36,
    maxTorqueNm: 4.0,
    description: 'Small motor gear drives a larger gear. Three motor turns give one arm gear turn.',
  },
  strong: {
    id: 'strong',
    label: 'Strong',
    ratioLabel: '6:1',
    driverTeeth: 8,
    drivenTeeth: 48,
    maxTorqueNm: 7.5,
    description: 'Very small motor gear drives a large gear. Six motor turns give one arm gear turn.',
  },
};

export const MOTOR_MISSIONS = [
  {
    id: 'quick-light',
    load: 'light',
    speedMin: 0.70,
    speedMax: 1.05,
    stressMax: 0.95,
    label: 'Lift the 1.0 kg foam block at a quick controlled speed.',
  },
  {
    id: 'steady-medium',
    load: 'medium',
    speedMin: 0.28,
    speedMax: 0.48,
    stressMax: 0.95,
    label: 'Lift the 3.0 kg tool pack at a steady speed.',
  },
  {
    id: 'heavy-slow',
    load: 'heavy',
    speedMin: 0.12,
    speedMax: 0.24,
    stressMax: 0.95,
    label: 'Lift the 6.0 kg battery slowly without strain.',
  },
];

export function randomMotorMission() {
  return MOTOR_MISSIONS[Math.floor(Math.random() * MOTOR_MISSIONS.length)];
}

export class MotorEngine {
  constructor() {
    this.power = 'medium';
    this.gear = 'balanced';
    this.load = 'medium';
  }

  setPower(power) {
    if (MOTOR_POWER[power]) this.power = power;
  }

  setGear(gear) {
    if (GEAR_SET[gear]) this.gear = gear;
  }

  setLoad(load) {
    if (ARM_LOAD[load]) this.load = load;
  }

  getState(power = this.power, gear = this.gear, load = this.load) {
    const p = MOTOR_POWER[power] ?? MOTOR_POWER.medium;
    const g = GEAR_SET[gear] ?? GEAR_SET.balanced;
    const l = ARM_LOAD[load] ?? ARM_LOAD.medium;
    const ratio = g.drivenTeeth / g.driverTeeth;
    const outputTorque = p.torque * ratio;
    const outputSpeed = p.speed / ratio;
    const stress = l.torqueNeeded / outputTorque;
    const motorTurnsForOneArmTurn = ratio;
    const armTurnsForOneMotorTurn = 1 / ratio;

    return {
      power,
      gear,
      load,
      powerInfo: p,
      gearInfo: g,
      loadInfo: l,
      ratio,
      outputTorque,
      outputSpeed,
      stress,
      motorTurnsForOneArmTurn,
      armTurnsForOneMotorTurn,
    };
  }

  evaluateMission(mission = MOTOR_MISSIONS[1]) {
    const s = this.getState();
    let outcome = 'success';
    let success = false;
    const target = mission ?? MOTOR_MISSIONS[1];

    if (s.load !== target.load) {
      outcome = 'wrongLoad';
    } else if (s.stress > 1.08 || s.stress > target.stressMax) {
      outcome = s.outputSpeed > 0.9 ? 'strain' : 'stall';
    } else if (s.outputSpeed > 1.15) {
      outcome = s.power === 'high' ? 'crash' : 'wobble';
    } else if (s.power === 'high' && s.stress < 0.65) {
      outcome = 'slam';
    } else if (s.outputSpeed < target.speedMin) {
      outcome = 'slow';
    } else if (s.outputSpeed > target.speedMax) {
      outcome = 'wobble';
    } else {
      outcome = 'success';
      success = true;
    }

    return {
      ...s,
      target,
      outcome,
      success,
    };
  }
}
