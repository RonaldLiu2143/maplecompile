import type { RotationClassData } from "./types";

import adeleData from "./data/adele.json";
import aranData from "./data/aran.json";
import blasterData from "./data/blaster.json";
import dkData from "./data/dk.json";
import daData from "./data/da.json";
import dsData from "./data/ds.json";
import hayatoData from "./data/hayato.json";
import heroData from "./data/hero.json";
import lenData from "./data/len.json";
import mihileData from "./data/mihile.json";
import kaiserData from "./data/kaiser.json";
import paladinData from "./data/paladin.json";
import smData from "./data/sm.json";
import zeroData from "./data/zero.json";
import bamData from "./data/bam.json";
import bsData from "./data/bs.json";
import evanData from "./data/evan.json";
import fpData from "./data/fp.json";
import fwData from "./data/fw.json";
import ilData from "./data/il.json";
import illiumData from "./data/illium.json";
import kannaData from "./data/kanna.json";
import kinesisData from "./data/kinesis.json";
import laraData from "./data/lara.json";
import lumiData from "./data/lumi.json";
import lynnData from "./data/lynn.json";
import siaData from "./data/sia.json";
import bmData from "./data/bm.json";
import xbmData from "./data/xbm.json";
import kainData from "./data/kain.json";
import mercData from "./data/merc.json";
import pfData from "./data/pf.json";
import whData from "./data/wh.json";
import wbData from "./data/wb.json";
import cadenaData from "./data/cadena.json";
import dbData from "./data/db.json";
import hyData from "./data/hy.json";
import khaliData from "./data/khali.json";
import nlData from "./data/nl.json";
import nwData from "./data/nw.json";
import phantomData from "./data/phantom.json";
import sdwData from "./data/sdw.json";
import xenonData from "./data/xenon.json";
import abData from "./data/ab.json";
import arkData from "./data/ark.json";
import cmData from "./data/cm.json";
import captainData from "./data/captain.json";
import eunwolData from "./data/eunwol.json";
import mechData from "./data/mech.json";
import mxData from "./data/mx.json";
import strikerData from "./data/striker.json";
import viperData from "./data/viper.json";

export const ROTATION_CLASS_DATA: Record<string, RotationClassData> = {
  "adele": adeleData as RotationClassData,
  "aran": aranData as RotationClassData,
  "blaster": blasterData as RotationClassData,
  "dk": dkData as RotationClassData,
  "da": daData as RotationClassData,
  "ds": dsData as RotationClassData,
  "hayato": hayatoData as RotationClassData,
  "hero": heroData as RotationClassData,
  "len": lenData as RotationClassData,
  "mihile": mihileData as RotationClassData,
  "kaiser": kaiserData as RotationClassData,
  "paladin": paladinData as RotationClassData,
  "sm": smData as RotationClassData,
  "zero": zeroData as RotationClassData,
  "bam": bamData as RotationClassData,
  "bs": bsData as RotationClassData,
  "evan": evanData as RotationClassData,
  "fp": fpData as RotationClassData,
  "fw": fwData as RotationClassData,
  "il": ilData as RotationClassData,
  "illium": illiumData as RotationClassData,
  "kanna": kannaData as RotationClassData,
  "kinesis": kinesisData as RotationClassData,
  "lara": laraData as RotationClassData,
  "lumi": lumiData as RotationClassData,
  "lynn": lynnData as RotationClassData,
  "sia": siaData as RotationClassData,
  "bm": bmData as RotationClassData,
  "xbm": xbmData as RotationClassData,
  "kain": kainData as RotationClassData,
  "merc": mercData as RotationClassData,
  "pf": pfData as RotationClassData,
  "wh": whData as RotationClassData,
  "wb": wbData as RotationClassData,
  "cadena": cadenaData as RotationClassData,
  "db": dbData as RotationClassData,
  "hy": hyData as RotationClassData,
  "khali": khaliData as RotationClassData,
  "nl": nlData as RotationClassData,
  "nw": nwData as RotationClassData,
  "phantom": phantomData as RotationClassData,
  "sdw": sdwData as RotationClassData,
  "xenon": xenonData as RotationClassData,
  "ab": abData as RotationClassData,
  "ark": arkData as RotationClassData,
  "cm": cmData as RotationClassData,
  "captain": captainData as RotationClassData,
  "eunwol": eunwolData as RotationClassData,
  "mech": mechData as RotationClassData,
  "mx": mxData as RotationClassData,
  "striker": strikerData as RotationClassData,
  "viper": viperData as RotationClassData,
};

export function getRotationClassData(charType: string): RotationClassData {
  return (
    ROTATION_CLASS_DATA[charType] ?? {
      charType,
      patchNote: "Unknown class",
      skills: [],
    }
  );
}
