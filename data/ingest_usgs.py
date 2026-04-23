"""
ingest_usgs.py — USGS splib07b ingestion script

Reads raw ASCII spectra, resamples to 380–2500 nm @ 1 nm, computes continuum
removal, and writes backend/data/spectra.json.

Run from repo root:
    uv run --project backend python data/ingest_usgs.py
"""

from pathlib import Path
import json
import re

import numpy as np
from scipy.interpolate import interp1d

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DATA_ROOT = Path(__file__).parent / "ASCIIdata_splib07b"
OUTPUT_PATH = Path(__file__).parent.parent / "backend" / "data" / "spectra.json"
SENTINEL = -1.23e34
TARGET_WL = np.arange(380, 2501, 1, dtype=float)  # 2121 points

WL_FILES = {
    "ASDFR": DATA_ROOT / "splib07b_Wavelengths_ASDFR_0.35-2.5microns_2151ch.txt",
    "BECK": DATA_ROOT / "splib07b_Wavelengths_BECK_Beckman_interp._3961_ch.txt",
}

CHAPTER_DIRS = {
    "ChapterM": DATA_ROOT / "ChapterM_Minerals",
    "ChapterV": DATA_ROOT / "ChapterV_Vegetation",
    "ChapterS": DATA_ROOT / "ChapterS_SoilsAndMixtures",
    "ChapterL": DATA_ROOT / "ChapterL_Liquids",
    "ChapterA": DATA_ROOT / "ChapterA_ArtificialMaterials",
}

# ---------------------------------------------------------------------------
# Manifest — 35 spectra, fully hardcoded
# ---------------------------------------------------------------------------

MANIFEST = [
    # ── Minerals: Phyllosilicates ──────────────────────────────────────────
    {
        "id": "kaolinite_cm3",
        "name": "Kaolinite CM3",
        "display_name": "Kaolinite",
        "category": "mineral",
        "subcategory": "phyllosilicate",
        "chapter": "ChapterM",
        "filename": "splib07b_Kaolinite_CM3_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1400, "description": "Al-OH overtone doublet (~1395/1415 nm)"},
            {"wavelength_nm": 2160, "description": "Al-OH combination band"},
            {"wavelength_nm": 2200, "description": "Strong Al-OH absorption, diagnostic doublet (~2160/2200 nm)"},
        ],
        "explanation": (
            "Kaolinite is a 1:1 layer clay mineral with a sharp Al-OH doublet near 2160 and 2200 nm "
            "that is highly diagnostic. It is a common weathering product of feldspars and is "
            "widely used as an indicator of hydrothermal alteration in argillic zones."
        ),
        "aliases": ["kaolin", "china clay"],
        "tags": ["clay", "alteration", "SWIR", "phyllosilicate"],
    },
    {
        "id": "muscovite_hs146",
        "name": "Muscovite HS146.1B",
        "display_name": "Muscovite",
        "category": "mineral",
        "subcategory": "phyllosilicate",
        "chapter": "ChapterM",
        "filename": "splib07b_Muscovite_HS146.1B_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1400, "description": "OH overtone"},
            {"wavelength_nm": 2200, "description": "Al-OH absorption (~2195 nm)"},
            {"wavelength_nm": 2350, "description": "Mg-OH / Si-O combination band"},
        ],
        "explanation": (
            "Muscovite is a potassic white mica with a strong Al-OH absorption near 2200 nm. "
            "Its position (2195 vs 2205 nm for phengite) is used to map Al-content in mica and "
            "distinguish phyllic from advanced argillic alteration zones."
        ),
        "aliases": ["white mica", "phengite"],
        "tags": ["mica", "alteration", "SWIR", "phyllosilicate"],
    },
    {
        "id": "chlorite_smr13",
        "name": "Chlorite SMR-13 (104–150 µm)",
        "display_name": "Chlorite",
        "category": "mineral",
        "subcategory": "phyllosilicate",
        "chapter": "ChapterM",
        "filename": "splib07b_Chlorite_SMR-13.a_104-150um_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1400, "description": "Fe-OH + Mg-OH overtone"},
            {"wavelength_nm": 2250, "description": "Fe-OH absorption, diagnostic for Fe-rich chlorite"},
            {"wavelength_nm": 2340, "description": "Mg-OH combination band"},
        ],
        "explanation": (
            "Chlorite is a 2:1:1 sheet silicate common in greenschist-facies rocks and propylitic "
            "alteration zones. Its Fe-OH feature near 2250 nm contrasts with the Al-OH feature of "
            "kaolinite/muscovite, making it useful in multi-mineral mapping."
        ),
        "aliases": ["clinochlore", "chamosite"],
        "tags": ["clay", "alteration", "SWIR", "phyllosilicate", "Fe-OH"],
    },
    {
        "id": "montmorillonite_cm20",
        "name": "Montmorillonite CM20",
        "display_name": "Montmorillonite",
        "category": "mineral",
        "subcategory": "phyllosilicate",
        "chapter": "ChapterM",
        "filename": "splib07b_Montmorillonite_CM20_BECKb_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1400, "description": "OH overtone"},
            {"wavelength_nm": 1900, "description": "Broad H2O combination band (interlayer water)"},
            {"wavelength_nm": 2200, "description": "Al-OH absorption"},
        ],
        "explanation": (
            "Montmorillonite is an expanding 2:1 smectite clay with a broad water absorption near "
            "1900 nm from interlayer H₂O. This feature distinguishes smectites from non-swelling "
            "clays. It is common in weathered profiles, bentonite deposits, and soils."
        ),
        "aliases": ["smectite", "bentonite"],
        "tags": ["clay", "smectite", "SWIR", "phyllosilicate", "H2O"],
    },
    # ── Minerals: Carbonates ───────────────────────────────────────────────
    {
        "id": "calcite_hs48",
        "name": "Calcite HS48.3B",
        "display_name": "Calcite",
        "category": "mineral",
        "subcategory": "carbonate",
        "chapter": "ChapterM",
        "filename": "splib07b_Calcite_HS48.3B_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 2160, "description": "CO3 overtone"},
            {"wavelength_nm": 2335, "description": "Strong CO3 combination band (diagnostic)"},
            {"wavelength_nm": 2530, "description": "CO3 combination (beyond 2500 nm)"},
        ],
        "explanation": (
            "Calcite (CaCO₃) has a strong carbonate absorption triplet near 2160, 2335 nm "
            "that is highly diagnostic. The exact position of the 2335 nm feature (~2340 nm for "
            "calcite vs ~2320 nm for dolomite) allows discrimination between the two carbonates."
        ),
        "aliases": ["limestone", "chalk", "marble"],
        "tags": ["carbonate", "SWIR", "CO3"],
    },
    {
        "id": "dolomite_cod2005",
        "name": "Dolomite COD2005",
        "display_name": "Dolomite",
        "category": "mineral",
        "subcategory": "carbonate",
        "chapter": "ChapterM",
        "filename": "splib07b_Dolomite_COD2005_BECKb_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 2160, "description": "CO3 overtone"},
            {"wavelength_nm": 2320, "description": "Strong CO3 combination band (~10 nm shift from calcite)"},
        ],
        "explanation": (
            "Dolomite (CaMg(CO₃)₂) is spectrally similar to calcite but with its main CO₃ feature "
            "shifted to ~2320 nm (vs ~2340 nm for calcite). This ~10–20 nm shift is a classic SWIR "
            "discrimination problem used in carbonate mapping from airborne sensors."
        ),
        "aliases": ["dolostone"],
        "tags": ["carbonate", "SWIR", "CO3", "Mg"],
    },
    # ── Minerals: Iron Oxides ──────────────────────────────────────────────
    {
        "id": "hematite_gds27",
        "name": "Hematite GDS27",
        "display_name": "Hematite",
        "category": "mineral",
        "subcategory": "iron oxide",
        "chapter": "ChapterM",
        "filename": "splib07b_Hematite_GDS27_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 550, "description": "Charge transfer band edge (visible red color)"},
            {"wavelength_nm": 860, "description": "Fe3+ crystal field absorption"},
        ],
        "explanation": (
            "Hematite (α-Fe₂O₃) is the most stable iron oxide and gives red soils and rocks their "
            "color. Its broad Fe³⁺ absorptions in the visible dominate its spectrum. It is commonly "
            "mapped on Mars and in tropical laterites, acid mine drainage, and gossan zones."
        ),
        "aliases": ["red iron oxide", "Fe2O3"],
        "tags": ["iron oxide", "visible", "Fe3+", "Mars", "gossans"],
    },
    {
        "id": "goethite_ws222",
        "name": "Goethite WS222 (Coarse Gr.)",
        "display_name": "Goethite",
        "category": "mineral",
        "subcategory": "iron oxide",
        "chapter": "ChapterM",
        "filename": "splib07b_Goethite_WS222_Coarse_Gr._BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 480, "description": "Charge transfer absorption"},
            {"wavelength_nm": 670, "description": "Fe3+ crystal field band"},
            {"wavelength_nm": 900, "description": "Fe3+ crystal field band (broader than hematite)"},
        ],
        "explanation": (
            "Goethite (α-FeOOH) is the most common iron oxyhydroxide in weathered profiles, giving "
            "soils a yellow-brown color. Its spectrum differs from hematite with a broader, longer "
            "wavelength visible absorption, making the two distinguishable with hyperspectral data."
        ),
        "aliases": ["limonite", "yellow iron oxide", "FeOOH"],
        "tags": ["iron oxide", "visible", "Fe3+", "weathering", "oxyhydroxide"],
    },
    {
        "id": "jarosite_gds98",
        "name": "Jarosite GDS98 (K, 90°C Syn.)",
        "display_name": "Jarosite",
        "category": "mineral",
        "subcategory": "iron oxide",
        "chapter": "ChapterM",
        "filename": "splib07b_Jarosite_GDS98_K_90C_Syn_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 435, "description": "Fe3+ charge transfer"},
            {"wavelength_nm": 930, "description": "Fe3+ crystal field"},
            {"wavelength_nm": 2270, "description": "S-OH + Fe-OH combination"},
        ],
        "explanation": (
            "Jarosite (KFe₃(SO₄)₂(OH)₆) is a sulfate-hydroxide forming in acid mine drainage and "
            "under oxidizing, sulfur-rich conditions. Its SWIR sulfate features combined with visible "
            "Fe³⁺ absorptions make it spectrally unique. It was detected on Mars by Opportunity rover."
        ),
        "aliases": ["iron sulfate"],
        "tags": ["sulfate", "iron oxide", "acid mine drainage", "Mars", "SWIR"],
    },
    # ── Minerals: Sulfates ─────────────────────────────────────────────────
    {
        "id": "gypsum_hs333",
        "name": "Gypsum HS333.1B (Selenite)",
        "display_name": "Gypsum",
        "category": "mineral",
        "subcategory": "sulfate",
        "chapter": "ChapterM",
        "filename": "splib07b_Gypsum_HS333.1B_(Selenite)_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1460, "description": "H2O combination band"},
            {"wavelength_nm": 1750, "description": "H2O combination overtone (diagnostic)"},
            {"wavelength_nm": 1945, "description": "H2O combination band"},
        ],
        "explanation": (
            "Gypsum (CaSO₄·2H₂O) has distinct water absorption features at 1460, 1750, and 1945 nm "
            "from its structural H₂O. The 1750 nm feature is particularly diagnostic and distinguishes "
            "gypsum from anhydrous sulfates. It is common in evaporite sequences and found on Mars."
        ),
        "aliases": ["selenite", "alabaster", "calcium sulfate dihydrate"],
        "tags": ["sulfate", "evaporite", "H2O", "SWIR", "Mars"],
    },
    {
        "id": "alunite_hs295",
        "name": "Alunite HS295.1B",
        "display_name": "Alunite",
        "category": "mineral",
        "subcategory": "sulfate",
        "chapter": "ChapterM",
        "filename": "splib07b_Alunite_HS295.1B_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1480, "description": "OH overtone"},
            {"wavelength_nm": 2165, "description": "Al-OH combination band"},
            {"wavelength_nm": 2320, "description": "S-OH + Al-OH combination band"},
        ],
        "explanation": (
            "Alunite (KAl₃(SO₄)₂(OH)₆) is a potassic sulfate forming in advanced argillic alteration "
            "above porphyry copper systems. Its diagnostic Al-OH features near 2165 and 2320 nm "
            "distinguish it from kaolinite and other clay minerals in the same alteration environment."
        ),
        "aliases": ["potassium aluminum sulfate"],
        "tags": ["sulfate", "alteration", "SWIR", "porphyry copper", "hydrothermal"],
    },
    # ── Minerals: Mafic / Silicates ────────────────────────────────────────
    {
        "id": "quartz_gds31",
        "name": "Quartz GDS31 (0–74 µm)",
        "display_name": "Quartz",
        "category": "mineral",
        "subcategory": "silicate",
        "chapter": "ChapterM",
        "filename": "splib07b_Quartz_GDS31_0-74um_fr_BECKa_AREF.txt",
        "diagnostic_features": [],
        "explanation": (
            "Quartz (SiO₂) is nearly featureless in the VSWIR range (380–2500 nm), exhibiting high "
            "reflectance with no diagnostic absorptions. This makes it a useful educational contrast "
            "and a 'trap' in quiz contexts, as it is the most abundant crustal mineral yet has no "
            "spectral signature to identify it by."
        ),
        "aliases": ["silicon dioxide", "chert", "flint"],
        "tags": ["silicate", "featureless", "VSWIR"],
    },
    {
        "id": "olivine_nmnh137044",
        "name": "Olivine NMNH137044 (160 µm)",
        "display_name": "Olivine",
        "category": "mineral",
        "subcategory": "silicate",
        "chapter": "ChapterM",
        "filename": "splib07b_Olivine_NMNH137044.a_160u_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1050, "description": "Broad Fe2+ crystal field absorption (~1 µm)"},
        ],
        "explanation": (
            "Olivine ((Mg,Fe)₂SiO₄) has a broad absorption centered near 1050 nm from Fe²⁺ crystal "
            "field transitions. The position shifts with Fe/Mg ratio (Fo content). It is abundant in "
            "mantle rocks, basalts, and komatiites, and is widely mapped in planetary remote sensing."
        ),
        "aliases": ["forsterite", "fayalite", "chrysolite", "peridot"],
        "tags": ["silicate", "mafic", "Fe2+", "1-micron", "planetary"],
    },
    {
        "id": "acmite_nmnh133746",
        "name": "Acmite NMNH133746 (Pyroxene)",
        "display_name": "Pyroxene (Acmite)",
        "category": "mineral",
        "subcategory": "silicate",
        "chapter": "ChapterM",
        "filename": "splib07b_Acmite_NMNH133746_Pyroxene_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1000, "description": "Fe2+ M1 crystal field absorption (~1 µm)"},
            {"wavelength_nm": 2000, "description": "Fe2+ M2 crystal field absorption (~2 µm)"},
        ],
        "explanation": (
            "Pyroxenes are single-chain silicates with two characteristic Fe²⁺ absorptions near "
            "1000 nm (M1 site) and 2000 nm (M2 site). These '1 and 2 µm bands' are the textbook "
            "example of crystal field absorptions and are used to map pyroxene-bearing basalts and "
            "ultramafic rocks in planetary and terrestrial remote sensing."
        ),
        "aliases": ["aegirine", "acmite", "clinopyroxene"],
        "tags": ["silicate", "mafic", "Fe2+", "pyroxene", "1-micron", "2-micron", "planetary"],
    },
    # ── Vegetation ─────────────────────────────────────────────────────────
    {
        "id": "oak_leaf_fresh",
        "name": "Oak Leaf-1 (fresh)",
        "display_name": "Oak Leaf (Fresh)",
        "category": "vegetation",
        "subcategory": "broadleaf",
        "chapter": "ChapterV",
        "filename": "splib07b_Oak_Oak-Leaf-1_fresh_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 680, "description": "Chlorophyll-a red absorption"},
            {"wavelength_nm": 720, "description": "Red edge — rapid reflectance rise"},
            {"wavelength_nm": 970, "description": "Liquid water absorption"},
            {"wavelength_nm": 1200, "description": "Liquid water overtone"},
            {"wavelength_nm": 1450, "description": "Strong liquid water absorption"},
            {"wavelength_nm": 1940, "description": "Liquid water combination band"},
        ],
        "explanation": (
            "Fresh green broadleaf vegetation has the classic 'green bump' at 550 nm, strong red "
            "chlorophyll absorption at 680 nm, and a sharp red edge near 720 nm. The NIR plateau "
            "(700–1300 nm) is caused by internal leaf scattering. Multiple liquid water absorptions "
            "at 970, 1200, 1450, and 1940 nm reflect leaf water content."
        ),
        "aliases": ["deciduous leaf", "green leaf"],
        "tags": ["vegetation", "broadleaf", "chlorophyll", "red edge", "water content"],
    },
    {
        "id": "engelmann_spruce",
        "name": "Engelmann Spruce Needles-1",
        "display_name": "Spruce Needles",
        "category": "vegetation",
        "subcategory": "conifer",
        "chapter": "ChapterV",
        "filename": "splib07b_Engelmann-Spruce_ES-Needls-1_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 680, "description": "Chlorophyll-a absorption"},
            {"wavelength_nm": 720, "description": "Red edge"},
            {"wavelength_nm": 1730, "description": "Cellulose/lignin absorption"},
            {"wavelength_nm": 2100, "description": "Cellulose + starch combination"},
        ],
        "explanation": (
            "Conifer needles have a similar overall shape to broadleaf vegetation but with lower NIR "
            "reflectance due to needle geometry and wax coatings. Dry matter absorption features from "
            "cellulose and lignin near 1730 and 2100 nm are more pronounced in conifers."
        ),
        "aliases": ["spruce", "conifer", "evergreen"],
        "tags": ["vegetation", "conifer", "needles", "cellulose", "lignin"],
    },
    {
        "id": "grass_golden_dry",
        "name": "Grass Golden Dry GDS480",
        "display_name": "Dry Grass (NPV)",
        "category": "vegetation",
        "subcategory": "non-photosynthetic",
        "chapter": "ChapterV",
        "filename": "splib07b_Grass_Golden_Dry_GDS480_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1730, "description": "Cellulose/lignin/dry matter absorption"},
            {"wavelength_nm": 2100, "description": "Cellulose + starch"},
            {"wavelength_nm": 2300, "description": "Lignin + cellulose combination band"},
        ],
        "explanation": (
            "Dry non-photosynthetic vegetation (NPV) lacks chlorophyll and water features, showing "
            "high, relatively flat reflectance with dry matter absorption features at 1730, 2100, "
            "and 2300 nm from cellulose, lignin, and starch. These are important for fire fuel "
            "mapping and carbon stock estimation."
        ),
        "aliases": ["NPV", "dry grass", "senescent vegetation", "straw"],
        "tags": ["vegetation", "NPV", "dry", "cellulose", "lignin", "SWIR"],
    },
    {
        "id": "cheatgrass_anpc1",
        "name": "Cheatgrass ANPC1 (field calib.)",
        "display_name": "Cheatgrass (Green)",
        "category": "vegetation",
        "subcategory": "grass",
        "chapter": "ChapterV",
        "filename": "splib07b_Cheatgrass_ANPC1_field_calib_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 680, "description": "Chlorophyll-a absorption"},
            {"wavelength_nm": 720, "description": "Red edge"},
            {"wavelength_nm": 970, "description": "Liquid water"},
        ],
        "explanation": (
            "Cheatgrass (Bromus tectorum) is an invasive annual grass that greens up early in spring "
            "before native species. This green spectrum shows typical graminoid features with a "
            "narrow-leaf chlorophyll signature. Its early-season spectral behavior is used in "
            "invasive species mapping."
        ),
        "aliases": ["Bromus tectorum", "downy brome", "invasive grass"],
        "tags": ["vegetation", "grass", "invasive", "chlorophyll"],
    },
    {
        "id": "spartina_green",
        "name": "S. alterniflora CRMS322v06 (green)",
        "display_name": "Spartina (Green Saltmarsh)",
        "category": "vegetation",
        "subcategory": "aquatic",
        "chapter": "ChapterV",
        "filename": "splib07b_S.alternif._CRMS322v06_grn.a_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 680, "description": "Chlorophyll-a absorption"},
            {"wavelength_nm": 720, "description": "Red edge"},
            {"wavelength_nm": 970, "description": "Leaf water"},
        ],
        "explanation": (
            "Spartina alterniflora (smooth cordgrass) is the dominant species in Atlantic and Gulf "
            "Coast saltmarshes. Its spectrum shows typical green vegetation features. Saltmarsh "
            "mapping with hyperspectral data uses species-specific spectral libraries like this one "
            "to track marsh health and invasive species."
        ),
        "aliases": ["cordgrass", "smooth cordgrass", "saltmarsh grass"],
        "tags": ["vegetation", "aquatic", "saltmarsh", "wetland", "coastal"],
    },
    {
        "id": "lichen_acarospora",
        "name": "Lichen Acarospora-1",
        "display_name": "Lichen (Acarospora)",
        "category": "vegetation",
        "subcategory": "cryptogam",
        "chapter": "ChapterV",
        "filename": "splib07b_Lichen_Acarospora-1_ASDFRb_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 490, "description": "Lichen pigment absorption"},
            {"wavelength_nm": 680, "description": "Chlorophyll absorption (weak)"},
        ],
        "explanation": (
            "Lichens are symbiotic organisms (fungus + photobiont) that colonize bare rock surfaces. "
            "Their spectra are variable depending on pigmentation but typically show weaker chlorophyll "
            "features than vascular plants. Biological soil crusts and lichen-covered rocks are mapped "
            "in dryland and polar ecosystems."
        ),
        "aliases": ["biological soil crust", "cryptobiotic crust"],
        "tags": ["vegetation", "lichen", "cryptogam", "crust", "rock"],
    },
    # ── Soils ──────────────────────────────────────────────────────────────
    {
        "id": "sand_dwo3",
        "name": "Sand DWO-3-DEL2a (no vis. oil)",
        "display_name": "Sand (Quartz-dominated)",
        "category": "soil",
        "subcategory": "sandy",
        "chapter": "ChapterS",
        "filename": "splib07b_Sand_DWO-3-DEL2a_no_vis.oil_ASDFRa_AREF.txt",
        "diagnostic_features": [],
        "explanation": (
            "Quartz-dominated sand has high, nearly featureless reflectance across the VSWIR. "
            "Its spectrum is bright and relatively flat, reflecting the SiO₂-dominated composition. "
            "This spectrum provides a baseline reference for bare sandy substrates in coastal and "
            "desert environments."
        ),
        "aliases": ["quartz sand", "beach sand"],
        "tags": ["soil", "sand", "quartz", "featureless"],
    },
    {
        "id": "illite_quartz_soil",
        "name": "Illite CU00-5B (Hi-Al + Quartz)",
        "display_name": "Illite-Quartz Soil",
        "category": "soil",
        "subcategory": "clay-rich",
        "chapter": "ChapterS",
        "filename": "splib07b_Illite_CU00-5B_Hi-Al+Quartz_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 2200, "description": "Al-OH clay absorption"},
            {"wavelength_nm": 2340, "description": "Clay + quartz combination"},
        ],
        "explanation": (
            "This clay-rich soil contains illite (Al-OH clay) mixed with quartz, showing moderate "
            "Al-OH absorptions near 2200 nm. Clay-rich soils are common in humid climates and "
            "agricultural land, and their spectral features help estimate clay content remotely."
        ),
        "aliases": ["clay soil", "illitic soil"],
        "tags": ["soil", "clay", "illite", "SWIR"],
    },
    {
        "id": "limestone_soil",
        "name": "Limestone CU02-11A",
        "display_name": "Limestone Soil (Caliche)",
        "category": "soil",
        "subcategory": "calcareous",
        "chapter": "ChapterS",
        "filename": "splib07b_Limestone_CU02-11A_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 2335, "description": "CO3 carbonate absorption"},
        ],
        "explanation": (
            "Calcareous soils and caliche (calcium carbonate crusts) show the diagnostic CO₃ "
            "absorption near 2335 nm. These soils are common in arid and semi-arid regions and "
            "on limestone parent material. Carbonate content can be estimated spectrally."
        ),
        "aliases": ["caliche", "calcareous soil", "carbonate soil"],
        "tags": ["soil", "carbonate", "limestone", "SWIR"],
    },
    {
        "id": "pyroxene_basalt",
        "name": "Pyroxene Basalt CU01-20A",
        "display_name": "Basaltic Soil",
        "category": "soil",
        "subcategory": "volcanic",
        "chapter": "ChapterS",
        "filename": "splib07b_Pyroxene_Basalt_CU01-20A_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1000, "description": "Fe2+ pyroxene absorption (~1 µm)"},
            {"wavelength_nm": 2000, "description": "Fe2+ pyroxene absorption (~2 µm)"},
        ],
        "explanation": (
            "Basaltic soils derived from pyroxene-rich volcanic rock retain the Fe²⁺ absorptions "
            "of pyroxene near 1000 and 2000 nm, though often subdued by weathering. These soils "
            "are found on volcanic islands, lava flows, and shield volcano flanks."
        ),
        "aliases": ["volcanic soil", "andisol", "mafic soil"],
        "tags": ["soil", "volcanic", "pyroxene", "basalt", "mafic"],
    },
    # ── Water / Snow / Ice ─────────────────────────────────────────────────
    {
        "id": "seawater_open_ocean",
        "name": "Seawater Open Ocean SW2 (lwch)",
        "display_name": "Open Ocean Seawater",
        "category": "water",
        "subcategory": "ocean",
        "chapter": "ChapterL",
        "filename": "splib07b_Seawater_Open_Ocean_SW2_lwch_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 760, "description": "Liquid water absorption onset"},
            {"wavelength_nm": 970, "description": "Liquid water combination band"},
        ],
        "explanation": (
            "Clear open ocean water has low reflectance overall, with a blue-green peak (400–550 nm) "
            "and near-zero reflectance beyond 700 nm due to strong liquid water absorption. "
            "Ocean color remote sensing uses subtle variations in this blue-green region to map "
            "phytoplankton, sediment, and dissolved organic matter."
        ),
        "aliases": ["ocean water", "saltwater", "marine water"],
        "tags": ["water", "ocean", "marine", "liquid water"],
    },
    {
        "id": "marsh_water_sunlit",
        "name": "Marsh Water CRMS322v84a (sunlit)",
        "display_name": "Marsh Water (Sunlit)",
        "category": "water",
        "subcategory": "wetland",
        "chapter": "ChapterV",
        "filename": "splib07b_Marsh_water_CRMS322v84a_sunl_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 570, "description": "Shallow water green peak"},
            {"wavelength_nm": 970, "description": "Liquid water absorption"},
        ],
        "explanation": (
            "Shallow marsh water under sunlit conditions may show some bottom reflectance and "
            "dissolved organic matter effects, resulting in a slightly different spectral shape "
            "from deep ocean water. Used in wetland mapping and water quality assessment."
        ),
        "aliases": ["shallow water", "wetland water", "pond water"],
        "tags": ["water", "wetland", "marsh", "shallow"],
    },
    {
        "id": "water_turbid_high",
        "name": "Water + Montmorillonite SWy-2 (16.5 g/L)",
        "display_name": "Turbid Water (High Sediment)",
        "category": "water",
        "subcategory": "turbid",
        "chapter": "ChapterL",
        "filename": "splib07b_Water+Montmor_SWy-2+16.5g-l_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 700, "description": "Sediment-dominated red reflectance"},
            {"wavelength_nm": 970, "description": "Liquid water absorption"},
            {"wavelength_nm": 1200, "description": "Liquid water overtone"},
        ],
        "explanation": (
            "High suspended sediment concentrations shift water reflectance from blue-green toward "
            "red-NIR. This montmorillonite-water mixture at 16.5 g/L shows dramatically increased "
            "reflectance compared to clear water, illustrating sediment plume detection in rivers "
            "and coastal areas."
        ),
        "aliases": ["muddy water", "sediment-laden water", "suspended sediment"],
        "tags": ["water", "turbid", "sediment", "clay"],
    },
    {
        "id": "snow_clean",
        "name": "Melting Snow mSnw01a",
        "display_name": "Clean Snow",
        "category": "water",
        "subcategory": "snow",
        "chapter": "ChapterL",
        "filename": "splib07b_Melting_snow_mSnw01a_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1030, "description": "Ice crystal absorption"},
            {"wavelength_nm": 1250, "description": "H2O ice absorption"},
            {"wavelength_nm": 1500, "description": "Strong ice absorption"},
        ],
        "explanation": (
            "Clean, fresh snow has very high reflectance in the visible (>0.9) with progressively "
            "stronger absorption in the NIR from ice crystal water absorptions. Grain size controls "
            "NIR reflectance — larger crystals absorb more. Snow cover mapping and melt monitoring "
            "rely on these spectral features."
        ),
        "aliases": ["fresh snow", "new snow", "white snow"],
        "tags": ["snow", "ice", "cryosphere", "H2O ice"],
    },
    {
        "id": "snow_slush",
        "name": "Melting Snow mSnw09 (slush)",
        "display_name": "Slush / Old Snow",
        "category": "water",
        "subcategory": "snow",
        "chapter": "ChapterL",
        "filename": "splib07b_Melting_snow_mSnw09_(slush)_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 970, "description": "Liquid water absorption (melt water)"},
            {"wavelength_nm": 1200, "description": "Liquid water overtone"},
        ],
        "explanation": (
            "Slush (partially melted snow) has lower visible reflectance than fresh snow and "
            "shows both ice crystal and liquid water absorption features. The mixture of liquid "
            "and solid water creates intermediate spectral properties used in snowmelt monitoring."
        ),
        "aliases": ["slush", "wet snow", "melting snow"],
        "tags": ["snow", "ice", "cryosphere", "melt", "liquid water"],
    },
    {
        "id": "ice_h2o",
        "name": "H2O Ice GDS136 (77K)",
        "display_name": "Water Ice",
        "category": "water",
        "subcategory": "ice",
        "chapter": "ChapterL",
        "filename": "splib07b_H2O-Ice_GDS136_77K_BECKa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1030, "description": "H2O ice absorption"},
            {"wavelength_nm": 1250, "description": "H2O ice overtone"},
            {"wavelength_nm": 1500, "description": "Strong H2O ice absorption"},
            {"wavelength_nm": 2020, "description": "H2O ice combination band"},
        ],
        "explanation": (
            "Pure water ice measured at 77K shows very deep, sharp absorption bands at the ice "
            "lattice vibrational frequencies. These features are used as reference for ice detection "
            "on planetary surfaces (Europa, Enceladus, Mars polar caps) and terrestrial glaciers."
        ),
        "aliases": ["glacial ice", "polar ice", "cryogenic ice"],
        "tags": ["ice", "cryosphere", "H2O ice", "planetary", "glacial"],
    },
    # ── Manmade / Artificial Materials ────────────────────────────────────
    {
        "id": "asphalt_aged_road",
        "name": "Asphalt GDS376 (Black Road, Aged)",
        "display_name": "Aged Road Asphalt",
        "category": "manmade",
        "subcategory": "pavement",
        "chapter": "ChapterA",
        "filename": "splib07b_Asphalt_GDS376_Blck_Road_old_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 2300, "description": "C-H hydrocarbon combination (aged bitumen)"},
        ],
        "explanation": (
            "Aged asphalt shows low, relatively flat reflectance from road bitumen. The spectrum "
            "brightens slightly with weathering as the dark hydrocarbon binder oxidizes. Asphalt "
            "mapping from airborne hyperspectral data supports urban heat island studies and "
            "impervious surface mapping."
        ),
        "aliases": ["bituminous road", "tarmac", "road surface"],
        "tags": ["manmade", "urban", "asphalt", "pavement", "impervious"],
    },
    {
        "id": "asphalt_tar_roof",
        "name": "Asphalt Tar GDS346 (Black Roof)",
        "display_name": "Tar Roof Asphalt",
        "category": "manmade",
        "subcategory": "roofing",
        "chapter": "ChapterA",
        "filename": "splib07b_Asphalt_Tar_GDS346_Blck_Roof_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 1730, "description": "C-H hydrocarbon overtone"},
            {"wavelength_nm": 2300, "description": "C-H combination band"},
        ],
        "explanation": (
            "Fresh tar/roofing asphalt is darker and shows hydrocarbon C-H absorption features "
            "from bitumen. These features distinguish fresh tar from aged road asphalt and from "
            "other dark materials in urban mapping."
        ),
        "aliases": ["tar paper", "roofing tar", "built-up roofing"],
        "tags": ["manmade", "urban", "asphalt", "roofing", "hydrocarbon"],
    },
    {
        "id": "concrete_road",
        "name": "Concrete GDS375 (Lt. Grey Road)",
        "display_name": "Light Grey Concrete",
        "category": "manmade",
        "subcategory": "pavement",
        "chapter": "ChapterA",
        "filename": "splib07b_Concrete_GDS375_Lt_Gry_Road_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 2335, "description": "CO3 from calcium carbonate in cement"},
        ],
        "explanation": (
            "Portland cement concrete has a grey-white spectrum with moderate reflectance and a "
            "carbonate feature near 2335 nm from the calcium carbonate/silicate binder. This "
            "distinguishes concrete from asphalt (dark, hydrocarbon features) in urban mapping."
        ),
        "aliases": ["cement", "Portland cement", "pavement"],
        "tags": ["manmade", "urban", "concrete", "pavement", "carbonate"],
    },
    {
        "id": "brick_red_paving",
        "name": "Brick GDS349 (Paving Red)",
        "display_name": "Red Paving Brick",
        "category": "manmade",
        "subcategory": "masonry",
        "chapter": "ChapterA",
        "filename": "splib07b_Brick_GDS349_Paving_Red_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 550, "description": "Iron oxide red reflectance peak"},
            {"wavelength_nm": 860, "description": "Fe3+ absorption from fired clay"},
        ],
        "explanation": (
            "Red brick derives its color from hematite (Fe₂O₃) formed during kiln firing of iron-rich "
            "clay. The spectrum shows a red-orange visible region from iron oxides and silicate "
            "features in the SWIR. Brick is mapped to distinguish roofing materials and "
            "building types in urban hyperspectral surveys."
        ),
        "aliases": ["fired clay", "terracotta", "clay brick"],
        "tags": ["manmade", "urban", "brick", "iron oxide", "clay"],
    },
    {
        "id": "paint_green_alum",
        "name": "Painted Aluminum GDS333 (Lt. Green)",
        "display_name": "Green Paint (Aluminum)",
        "category": "manmade",
        "subcategory": "paint",
        "chapter": "ChapterA",
        "filename": "splib07b_Painted_Aluminum_GDS333_LgGr_ASDFRa_AREF.txt",
        "diagnostic_features": [
            {"wavelength_nm": 550, "description": "Green pigment reflectance peak"},
        ],
        "explanation": (
            "Painted metal surfaces show spectra dominated by the pigment. Green paint has a "
            "reflectance peak around 550 nm from the green pigment. The SWIR is relatively "
            "featureless compared to minerals, distinguishing paint from vegetation or minerals "
            "in urban mapping."
        ),
        "aliases": ["green paint", "painted metal"],
        "tags": ["manmade", "urban", "paint", "metal"],
    },
]

# ---------------------------------------------------------------------------
# Core Functions
# ---------------------------------------------------------------------------


def load_ascii(path: Path) -> np.ndarray:
    """Skip header line, read floats; replace sentinel with NaN."""
    vals = []
    with open(path) as f:
        next(f)  # skip header line
        for line in f:
            line = line.strip()
            if not line:
                continue
            v = float(line)
            vals.append(np.nan if v < SENTINEL * 0.5 else v)
    return np.array(vals)


def instrument_family(filename: str) -> str:
    if re.search(r"_ASDFR[a-z]_", filename):
        return "ASDFR"
    if re.search(r"_BECK[a-z]_", filename):
        return "BECK"
    raise ValueError(f"Unknown instrument in: {filename}")


def resample(src_wl: np.ndarray, src_rf: np.ndarray) -> np.ndarray:
    """Interpolate src spectrum onto TARGET_WL; NaN outside source range (no extrapolation)."""
    valid = np.isfinite(src_rf)
    if valid.sum() < 2:
        return np.full(len(TARGET_WL), np.nan)
    f = interp1d(
        src_wl[valid],
        src_rf[valid],
        kind="linear",
        bounds_error=False,
        fill_value=np.nan,
    )
    return f(TARGET_WL)


def check_coverage(rf: np.ndarray, spectrum_id: str) -> None:
    """Warn if spectrum doesn't fully cover 380–2500 nm."""
    valid = np.isfinite(rf)
    if not valid.any():
        print(f"WARNING [{spectrum_id}]: no valid data in 380–2500 nm range")
        return
    first_valid_nm = int(TARGET_WL[valid][0])
    last_valid_nm = int(TARGET_WL[valid][-1])
    if first_valid_nm > 380:
        print(
            f"WARNING [{spectrum_id}]: data starts at {first_valid_nm} nm (not 380 nm) — "
            f"{first_valid_nm - 380} leading bands will be null"
        )
    if last_valid_nm < 2500:
        print(
            f"WARNING [{spectrum_id}]: data ends at {last_valid_nm} nm (not 2500 nm) — "
            f"{2500 - last_valid_nm} trailing bands will be null"
        )


def _upper_hull(pts: list) -> list:
    """Upper convex hull (monotone chain, upper part only)."""
    hull = []
    for p in sorted(pts):
        while len(hull) >= 2:
            O, A, B = hull[-2], hull[-1], p
            cross = (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0])
            if cross >= 0:
                hull.pop()
            else:
                break
        hull.append(p)
    return hull


def continuum_removal(rf: np.ndarray) -> np.ndarray:
    """Divide spectrum by its upper convex hull continuum."""
    valid = np.isfinite(rf) & (rf >= 0)
    if valid.sum() < 2:
        return np.full_like(rf, np.nan)
    pts = list(zip(TARGET_WL[valid].tolist(), rf[valid].tolist()))
    hull = _upper_hull(pts)
    hull_wl, hull_rf = zip(*hull)
    continuum = np.interp(TARGET_WL, hull_wl, hull_rf)
    cr = np.where(valid & (continuum > 0), rf / continuum, np.nan)
    return cr


def build_record(entry: dict, wl_arrays: dict) -> dict | None:
    path = CHAPTER_DIRS[entry["chapter"]] / entry["filename"]
    if not path.exists():
        print(f"ERROR: not found — {entry['filename']}")
        return None

    raw = load_ascii(path)
    fam = instrument_family(entry["filename"])
    rf = resample(wl_arrays[fam], raw)
    check_coverage(rf, entry["id"])
    rf_cr = continuum_removal(rf)

    def _ser(arr):
        return [
            None if (v is None or (isinstance(v, float) and np.isnan(v))) else round(float(v), 5)
            for v in arr
        ]

    return {
        "id": entry["id"],
        "name": entry["name"],
        "category": entry["category"],
        "subcategory": entry["subcategory"],
        "display_name": entry["display_name"],
        "source_library": "USGS splib07b",
        "source_id": entry["filename"],
        "wavelengths_nm": TARGET_WL.astype(int).tolist(),
        "reflectance": _ser(rf),
        "reflectance_cr": _ser(rf_cr),
        "diagnostic_features": entry["diagnostic_features"],
        "explanation": entry["explanation"],
        "aliases": entry["aliases"],
        "tags": entry["tags"],
    }


def main():
    print("Loading wavelength files...")
    wl_arrays = {}
    for key, wl_path in WL_FILES.items():
        wl_raw = load_ascii(wl_path)
        wl_arrays[key] = wl_raw * 1000.0  # microns → nm
        print(f"  {key}: {len(wl_arrays[key])} channels, "
              f"{wl_arrays[key][0]:.1f}–{wl_arrays[key][-1]:.1f} nm")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    records = []
    for entry in MANIFEST:
        rec = build_record(entry, wl_arrays)
        if rec:
            records.append(rec)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(records, f, indent=2)
    print(f"\nWrote {len(records)}/{len(MANIFEST)} spectra → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
