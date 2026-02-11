/**
 * Transit Network Data
 * Geographic coordinates for metro, tram, and suburban rail stations
 * in Athens and Thessaloniki, plus line route polylines.
 * Coordinates sourced from Wikipedia.
 */

export interface TransitStation {
  id: string;
  name: string;
  nameEl: string;
  latitude: number;
  longitude: number;
  lineIds: string[];
  isInterchange?: boolean;
}

export interface TransitLine {
  id: string;
  name: string;
  nameEl: string;
  color: string;
  type: "metro" | "tram" | "suburban";
  coordinates: [number, number][]; // [lng, lat] for GeoJSON
}

export interface TransitNetwork {
  stations: TransitStation[];
  lines: TransitLine[];
}

// =============================================================================
// ATHENS TRANSIT NETWORK
// =============================================================================

const athensStations: TransitStation[] = [
  // =========================================================================
  // LINE 1 (Green) - Piraeus to Kifissia — ISAP
  // =========================================================================
  { id: "l1-piraeus", name: "Piraeus", nameEl: "Πειραιάς", latitude: 37.9480, longitude: 23.6436, lineIds: ["line1", "line3"], isInterchange: true },
  { id: "l1-faliro", name: "Faliro", nameEl: "Φάληρο", latitude: 37.9453, longitude: 23.6656, lineIds: ["line1"] },
  { id: "l1-moschato", name: "Moschato", nameEl: "Μοσχάτο", latitude: 37.9556, longitude: 23.6809, lineIds: ["line1"] },
  { id: "l1-kallithea", name: "Kallithea", nameEl: "Καλλιθέα", latitude: 37.9607, longitude: 23.6976, lineIds: ["line1"] },
  { id: "l1-tavros", name: "Tavros", nameEl: "Ταύρος", latitude: 37.9629, longitude: 23.7039, lineIds: ["line1"] },
  { id: "l1-petralona", name: "Petralona", nameEl: "Πετράλωνα", latitude: 37.9688, longitude: 23.7095, lineIds: ["line1"] },
  { id: "l1-thissio", name: "Thissio", nameEl: "Θησείο", latitude: 37.9769, longitude: 23.7203, lineIds: ["line1"] },
  { id: "l1-monastiraki", name: "Monastiraki", nameEl: "Μοναστηράκι", latitude: 37.9760, longitude: 23.7254, lineIds: ["line1", "line3"], isInterchange: true },
  { id: "l1-omonia", name: "Omonia", nameEl: "Ομόνοια", latitude: 37.9840, longitude: 23.7280, lineIds: ["line1", "line2"], isInterchange: true },
  { id: "l1-victoria", name: "Victoria", nameEl: "Βικτώρια", latitude: 37.9932, longitude: 23.7305, lineIds: ["line1"] },
  { id: "l1-attiki", name: "Attiki", nameEl: "Αττική", latitude: 37.9994, longitude: 23.7228, lineIds: ["line1", "line2"], isInterchange: true },
  { id: "l1-ag-nikolaos", name: "Agios Nikolaos", nameEl: "Άγιος Νικόλαος", latitude: 38.0068, longitude: 23.7276, lineIds: ["line1"] },
  { id: "l1-kato-patissia", name: "Kato Patissia", nameEl: "Κάτω Πατήσια", latitude: 38.0115, longitude: 23.7287, lineIds: ["line1"] },
  { id: "l1-ag-eleftherios", name: "Agios Eleftherios", nameEl: "Άγιος Ελευθέριος", latitude: 38.0172, longitude: 23.7311, lineIds: ["line1"] },
  { id: "l1-ano-patissia", name: "Ano Patissia", nameEl: "Άνω Πατήσια", latitude: 38.0210, longitude: 23.7351, lineIds: ["line1"] },
  { id: "l1-perissos", name: "Perissos", nameEl: "Περισσός", latitude: 38.0329, longitude: 23.7448, lineIds: ["line1"] },
  { id: "l1-pefkakia", name: "Pefkakia", nameEl: "Πευκάκια", latitude: 38.0372, longitude: 23.7501, lineIds: ["line1"] },
  { id: "l1-nea-ionia", name: "Nea Ionia", nameEl: "Νέα Ιωνία", latitude: 38.0416, longitude: 23.7549, lineIds: ["line1"] },
  { id: "l1-iraklio", name: "Iraklio", nameEl: "Ηράκλειο", latitude: 38.0463, longitude: 23.7663, lineIds: ["line1"] },
  { id: "l1-irini", name: "Irini", nameEl: "Ειρήνη", latitude: 38.0435, longitude: 23.7835, lineIds: ["line1", "suburban"], isInterchange: true },
  { id: "l1-neratziotissa", name: "Neratziotissa", nameEl: "Νερατζιώτισσα", latitude: 38.0452, longitude: 23.7929, lineIds: ["line1", "suburban"], isInterchange: true },
  { id: "l1-maroussi", name: "Maroussi", nameEl: "Μαρούσι", latitude: 38.0562, longitude: 23.8022, lineIds: ["line1"] },
  { id: "l1-kat", name: "KAT", nameEl: "ΚΑΤ", latitude: 38.0662, longitude: 23.8042, lineIds: ["line1"] },
  { id: "l1-kifissia", name: "Kifissia", nameEl: "Κηφισιά", latitude: 38.0733, longitude: 23.8083, lineIds: ["line1"] },

  // =========================================================================
  // LINE 2 (Red) - Anthoupoli to Elliniko
  // =========================================================================
  { id: "l2-anthoupoli", name: "Anthoupoli", nameEl: "Ανθούπολη", latitude: 38.0168, longitude: 23.6919, lineIds: ["line2"] },
  { id: "l2-peristeri", name: "Peristeri", nameEl: "Περιστέρι", latitude: 38.0131, longitude: 23.6958, lineIds: ["line2"] },
  { id: "l2-ag-antonios", name: "Agios Antonios", nameEl: "Άγιος Αντώνιος", latitude: 38.0073, longitude: 23.7002, lineIds: ["line2"] },
  { id: "l2-sepolia", name: "Sepolia", nameEl: "Σεπόλια", latitude: 38.0029, longitude: 23.7137, lineIds: ["line2"] },
  // Attiki is interchange with Line 1 — updated above
  // Omonia is interchange with Line 1 — updated above
  { id: "l2-larissa", name: "Larissa Station", nameEl: "Σταθμός Λαρίσης", latitude: 37.9924, longitude: 23.7207, lineIds: ["line2"] },
  { id: "l2-metaxourgio", name: "Metaxourgio", nameEl: "Μεταξουργείο", latitude: 37.9859, longitude: 23.7215, lineIds: ["line2"] },
  { id: "l2-panepistimio", name: "Panepistimio", nameEl: "Πανεπιστήμιο", latitude: 37.9804, longitude: 23.7332, lineIds: ["line2"] },
  { id: "l2-syntagma", name: "Syntagma", nameEl: "Σύνταγμα", latitude: 37.9753, longitude: 23.7353, lineIds: ["line2", "line3"], isInterchange: true },
  { id: "l2-akropoli", name: "Akropoli", nameEl: "Ακρόπολη", latitude: 37.9687, longitude: 23.7295, lineIds: ["line2"] },
  { id: "l2-syngrou-fix", name: "Syngrou-Fix", nameEl: "Συγγρού-Φιξ", latitude: 37.9646, longitude: 23.7268, lineIds: ["line2"] },
  { id: "l2-neos-kosmos", name: "Neos Kosmos", nameEl: "Νέος Κόσμος", latitude: 37.9578, longitude: 23.7281, lineIds: ["line2"] },
  { id: "l2-ag-ioannis", name: "Agios Ioannis", nameEl: "Άγιος Ιωάννης", latitude: 37.9566, longitude: 23.7343, lineIds: ["line2"] },
  { id: "l2-dafni", name: "Dafni", nameEl: "Δάφνη", latitude: 37.9497, longitude: 23.7373, lineIds: ["line2"] },
  { id: "l2-ag-dimitrios", name: "Agios Dimitrios", nameEl: "Άγιος Δημήτριος", latitude: 37.9404, longitude: 23.7408, lineIds: ["line2"] },
  { id: "l2-ilioupoli", name: "Ilioupoli", nameEl: "Ηλιούπολη", latitude: 37.9297, longitude: 23.7446, lineIds: ["line2"] },
  { id: "l2-alimos", name: "Alimos", nameEl: "Άλιμος", latitude: 37.9182, longitude: 23.7446, lineIds: ["line2"] },
  { id: "l2-argyroupoli", name: "Argyroupoli", nameEl: "Αργυρούπολη", latitude: 37.9032, longitude: 23.7460, lineIds: ["line2"] },
  { id: "l2-elliniko", name: "Elliniko", nameEl: "Ελληνικό", latitude: 37.8927, longitude: 23.7473, lineIds: ["line2"] },

  // =========================================================================
  // LINE 3 (Blue) - Dimotiko Theatro to Airport
  // =========================================================================
  { id: "l3-dimotiko", name: "Dimotiko Theatro", nameEl: "Δημοτικό Θέατρο", latitude: 37.9429, longitude: 23.6476, lineIds: ["line3"] },
  { id: "l3-maniatika", name: "Maniatika", nameEl: "Μανιάτικα", latitude: 37.9596, longitude: 23.6399, lineIds: ["line3"] },
  { id: "l3-nikaia", name: "Nikaia", nameEl: "Νίκαια", latitude: 37.9659, longitude: 23.6474, lineIds: ["line3"] },
  { id: "l3-korydallos", name: "Korydallos", nameEl: "Κορυδαλλός", latitude: 37.9772, longitude: 23.6506, lineIds: ["line3"] },
  { id: "l3-ag-varvara", name: "Agia Varvara", nameEl: "Αγία Βαρβάρα", latitude: 37.9901, longitude: 23.6595, lineIds: ["line3"] },
  { id: "l3-ag-marina", name: "Agia Marina", nameEl: "Αγία Μαρίνα", latitude: 37.9970, longitude: 23.6681, lineIds: ["line3"] },
  { id: "l3-egaleo", name: "Egaleo", nameEl: "Αιγάλεω", latitude: 37.9921, longitude: 23.6821, lineIds: ["line3"] },
  { id: "l3-eleonas", name: "Eleonas", nameEl: "Ελαιώνας", latitude: 37.9878, longitude: 23.6935, lineIds: ["line3"] },
  { id: "l3-kerameikos", name: "Kerameikos", nameEl: "Κεραμεικός", latitude: 37.9787, longitude: 23.7115, lineIds: ["line3"] },
  // Monastiraki, Syntagma, Evangelismos
  { id: "l3-evangelismos", name: "Evangelismos", nameEl: "Ευαγγελισμός", latitude: 37.9764, longitude: 23.7469, lineIds: ["line3"] },
  { id: "l3-megaro-moussikis", name: "Megaro Moussikis", nameEl: "Μέγαρο Μουσικής", latitude: 37.9788, longitude: 23.7539, lineIds: ["line3"] },
  { id: "l3-ambelokipi", name: "Ambelokipi", nameEl: "Αμπελόκηποι", latitude: 37.9910, longitude: 23.7602, lineIds: ["line3"] },
  { id: "l3-panormou", name: "Panormou", nameEl: "Πανόρμου", latitude: 37.9929, longitude: 23.7668, lineIds: ["line3"] },
  { id: "l3-katehaki", name: "Katehaki", nameEl: "Κατεχάκη", latitude: 37.9932, longitude: 23.7766, lineIds: ["line3"] },
  { id: "l3-ethniki-amyna", name: "Ethniki Amyna", nameEl: "Εθνική Άμυνα", latitude: 38.0001, longitude: 23.7857, lineIds: ["line3"] },
  { id: "l3-holargos", name: "Holargos", nameEl: "Χολαργός", latitude: 38.0066, longitude: 23.7927, lineIds: ["line3"] },
  { id: "l3-nomismatokopio", name: "Nomismatokopio", nameEl: "Νομισματοκοπείο", latitude: 38.0094, longitude: 23.8054, lineIds: ["line3"] },
  { id: "l3-ag-paraskevi", name: "Agia Paraskevi", nameEl: "Αγία Παρασκευή", latitude: 38.0126, longitude: 23.8169, lineIds: ["line3"] },
  { id: "l3-halandri", name: "Halandri", nameEl: "Χαλάνδρι", latitude: 38.0218, longitude: 23.8209, lineIds: ["line3"] },
  { id: "l3-douk-plakentias", name: "Douk. Plakentias", nameEl: "Δουκ. Πλακεντίας", latitude: 38.0233, longitude: 23.8239, lineIds: ["line3", "suburban"], isInterchange: true },
  { id: "l3-pallini", name: "Pallini", nameEl: "Παλλήνη", latitude: 38.0054, longitude: 23.8696, lineIds: ["line3"] },
  { id: "l3-paiania-kantza", name: "Paiania-Kantza", nameEl: "Παιανία-Κάντζα", latitude: 37.9837, longitude: 23.8789, lineIds: ["line3"] },
  { id: "l3-koropi", name: "Koropi", nameEl: "Κορωπί", latitude: 37.9130, longitude: 23.9122, lineIds: ["line3"] },
  { id: "l3-airport", name: "Airport", nameEl: "Αεροδρόμιο", latitude: 37.9364, longitude: 23.9369, lineIds: ["line3"] },

  // =========================================================================
  // TRAM — T6: Syntagma → (south on Syngrou) → coast → Pikrodafni
  //         T7: Agia Triada (Piraeus) → coast east → south → Voula
  // =========================================================================
  // =========================================================================
  // TRAM — T6: Syntagma ↔ Pikrodafni
  //         T7: Agia Triada (Piraeus) ↔ Asklipieio Voulas
  // =========================================================================
  // Syntagma → Pikrodafni (T6) & Agia Triada → Voula (T7)
  { id: "tram-syntagma", name: "Syntagma (Tram)", nameEl: "Σύνταγμα (Τραμ)", latitude: 37.9753, longitude: 23.7353, lineIds: ["t6", "t7"] },
  { id: "tram-zappeio", name: "Zappeio", nameEl: "Ζάππειο", latitude: 37.9686, longitude: 23.7379, lineIds: ["t6", "t7"] },
  { id: "tram-leof-vouliagmenis", name: "Leoforos Vouliagmenis", nameEl: "Λεωφ. Βουλιαγμένης", latitude: 37.9667, longitude: 23.7318, lineIds: ["t6", "t7"] },
  { id: "tram-fix", name: "Fix (Tram)", nameEl: "Φιξ (Τραμ)", latitude: 37.9646, longitude: 23.7268, lineIds: ["t6", "t7"] },
  { id: "tram-kasomouli", name: "Kasomouli", nameEl: "Κασομούλη", latitude: 37.9604, longitude: 23.7235, lineIds: ["t6", "t7"] },
  { id: "tram-neos-kosmos-tram", name: "Neos Kosmos (Tram)", nameEl: "Νέος Κόσμος (Τραμ)", latitude: 37.9578, longitude: 23.7281, lineIds: ["t6", "t7"] },
  { id: "tram-baknana", name: "Baknana", nameEl: "Μπακνανά", latitude: 37.9547, longitude: 23.7225, lineIds: ["t6", "t7"] },
  { id: "tram-aegeou", name: "Aegeou", nameEl: "Αιγαίου", latitude: 37.9515, longitude: 23.7170, lineIds: ["t6", "t7"] },
  { id: "tram-ag-fotini", name: "Agia Fotini", nameEl: "Αγία Φωτεινή", latitude: 37.9500, longitude: 23.7264, lineIds: ["t6", "t7"] },
  { id: "tram-meg-alexandrou", name: "Megalou Alexandrou", nameEl: "Μεγάλου Αλεξάνδρου", latitude: 37.9489, longitude: 23.7233, lineIds: ["t6", "t7"] },
  { id: "tram-ag-paraskevi-tram", name: "Agia Paraskevi (Tram)", nameEl: "Αγία Παρασκευή (Τραμ)", latitude: 37.9481, longitude: 23.7199, lineIds: ["t6", "t7"] },
  { id: "tram-medeas", name: "Medeas-Mykalis", nameEl: "Μηδείας-Μυκάλης", latitude: 37.9467, longitude: 23.7158, lineIds: ["t6", "t7"] },
  { id: "tram-evangeliki", name: "Evangeliki Scholi", nameEl: "Ευαγγελική Σχολή", latitude: 37.9450, longitude: 23.7117, lineIds: ["t6", "t7"] },
  { id: "tram-achilleos", name: "Achilleos", nameEl: "Αχιλλέως", latitude: 37.9428, longitude: 23.7072, lineIds: ["t6", "t7"] },
  { id: "tram-amfitheas", name: "Amfitheas", nameEl: "Αμφιθέας", latitude: 37.9403, longitude: 23.7033, lineIds: ["t6", "t7"] },
  { id: "tram-panagitsa", name: "Panagitsa", nameEl: "Παναγίτσα", latitude: 37.9392, longitude: 23.6992, lineIds: ["t6", "t7"] },
  { id: "tram-mousson", name: "Mousson", nameEl: "Μουσών", latitude: 37.9360, longitude: 23.6950, lineIds: ["t6", "t7"] },

  // **Shared coastal stops**
  { id: "tram-edem", name: "Edem", nameEl: "Εδέμ", latitude: 37.91856, longitude: 23.70075, lineIds: ["t6", "t7"], isInterchange: true }, // :contentReference[oaicite:2]{index=2}
  { id: "tram-pikrodafni", name: "Pikrodafni", nameEl: "Πικροδάφνη", latitude: 37.91577, longitude: 23.705615, lineIds: ["t6", "t7"], isInterchange: true }, // :contentReference[oaicite:3]{index=3}

  // **Piraeus branch (T7 Piraeus Loop)**
  { id: "tram-ag-triada", name: "Agia Triada", nameEl: "Αγία Τριάδα", latitude: 37.9475, longitude: 23.6450, lineIds: ["t7"] },
  { id: "tram-ippodameias", name: "Plateia Ippodameias", nameEl: "Πλ. Ιπποδαμείας", latitude: 37.9403, longitude: 23.6486, lineIds: ["t7"] },
  { id: "tram-34-syntagma", name: "34 Synt. Pezikou", nameEl: "34ου Συντ. Πεζικού", latitude: 37.9367, longitude: 23.6511, lineIds: ["t7"] },
  { id: "tram-androutsou", name: "Androutsou", nameEl: "Ανδρούτσου", latitude: 37.9358, longitude: 23.6503, lineIds: ["t7"] },
  { id: "tram-omiridou", name: "Omiridou Skylitsi", nameEl: "Ομ. Σκυλίτση", latitude: 37.9342, longitude: 23.6531, lineIds: ["t7"] },
  { id: "tram-sef", name: "SEF", nameEl: "ΣΕΦ", latitude: 37.9410, longitude: 23.6670, lineIds: ["t7"] },
  { id: "tram-neo-faliro", name: "Neo Faliro (Tram)", nameEl: "Νέο Φάληρο (Τραμ)", latitude: 37.9442, longitude: 23.6655, lineIds: ["t7"] },
  { id: "tram-mikras-asias", name: "Mikras Asias", nameEl: "Μικράς Ασίας", latitude: 37.9356, longitude: 23.6481, lineIds: ["t7"] },
  { id: "tram-dimarcheio", name: "Dimarcheio (Piraeus)", nameEl: "Δημαρχείο (Πειραιάς)", latitude: 37.9422, longitude: 23.6461, lineIds: ["t7"] },

  // **Coastal stops (Piraeus to Edem – T7)**
  { id: "tram-moschato-tram", name: "Moschato (Tram)", nameEl: "Μοσχάτο (Τραμ)", latitude: 37.9450, longitude: 23.6690, lineIds: ["t7"] },
  { id: "tram-kallithea-tram", name: "Kallithea (Tram)", nameEl: "Καλλιθέα (Τραμ)", latitude: 37.9440, longitude: 23.6710, lineIds: ["t7"] },
  { id: "tram-tzitzifies", name: "Tzitzifies", nameEl: "Τζιτζιφιές", latitude: 37.9420, longitude: 23.6730, lineIds: ["t7"] },
  { id: "tram-delta-falirou", name: "Delta Falirou", nameEl: "Δέλτα Φαλήρου", latitude: 37.94040, longitude: 23.67500, lineIds: ["t7"] },
  { id: "tram-agia-skepi", name: "Agia Skepi", nameEl: "Αγία Σκέπη", latitude: 37.9380, longitude: 23.6770, lineIds: ["t7"] },
  { id: "tram-trocadero", name: "Trocadero", nameEl: "Τροκαντερό", latitude: 37.9353, longitude: 23.6790, lineIds: ["t7"] },
  { id: "tram-parko-flisvou", name: "Parko Flisvou", nameEl: "Πάρκο Φλοίσβου", latitude: 37.92782, longitude: 23.68838, lineIds: ["t7"] },
  { id: "tram-flisvos", name: "Flisvos", nameEl: "Φλοίσβος", latitude: 37.92336, longitude: 23.69289, lineIds: ["t7"] },

  // **Glyfada branch (T7 coastal)**
  { id: "tram-marina-alimou", name: "Marina Alimou", nameEl: "Μαρίνα Αλίμου", latitude: 37.91312, longitude: 23.708605, lineIds: ["t7"] },
  { id: "tram-kalamaki", name: "Kalamaki", nameEl: "Καλαμάκι", latitude: 37.90956, longitude: 23.713045, lineIds: ["t7"] },
  { id: "tram-zefyros", name: "Zefyros", nameEl: "Ζέφυρος", latitude: 37.906535, longitude: 23.71689, lineIds: ["t7"] },
  { id: "tram-loutra-alimou", name: "Loutra Alimou", nameEl: "Λουτρά Αλίμου", latitude: 37.90236, longitude: 23.71953, lineIds: ["t7"] },
  { id: "tram-elliniko-tram", name: "Elliniko (Tram)", nameEl: "Ελληνικό (Τραμ)", latitude: 37.898, longitude: 23.722, lineIds: ["t7"] },
  { id: "tram-1st-ag-kosma", name: "1st Ag. Kosma", nameEl: "1η Αγ. Κοσμά", latitude: 37.892, longitude: 23.725, lineIds: ["t7"] },
  { id: "tram-2nd-ag-kosma", name: "2nd Ag. Kosma", nameEl: "2η Αγ. Κοσμά", latitude: 37.889, longitude: 23.727, lineIds: ["t7"] },
  { id: "tram-ag-alexandros", name: "Agios Alexandros", nameEl: "Άγιος Αλέξανδρος", latitude: 37.8851, longitude: 23.7269, lineIds: ["t7"] },
  { id: "tram-ellinon-olymp", name: "Ellinon Olympionikon", nameEl: "Ελλήνων Ολυμπιονικών", latitude: 37.881, longitude: 23.7296, lineIds: ["t7"] },
  { id: "tram-kentro-istio", name: "Kentro Istioploias", nameEl: "Κέντρο Ιστιοπλοίας", latitude: 37.87576, longitude: 23.731905, lineIds: ["t7"] },
  { id: "tram-plateia-vergoti", name: "Plateia Vergoti", nameEl: "Πλατεία Βεργωτή", latitude: 37.871556, longitude: 23.735055, lineIds: ["t7"] },
  { id: "tram-glyfada", name: "Paralia Glyfadas", nameEl: "Παραλία Γλυφάδας", latitude: 37.86764, longitude: 23.738585, lineIds: ["t7"] },
  { id: "tram-paleo-dimarhio", name: "Paleo Dimarhio", nameEl: "Παλαιό Δημαρχείο", latitude: 37.864545, longitude: 23.74337, lineIds: ["t7"] },
  { id: "tram-plateia-katraki", name: "Plateia Katraki", nameEl: "Πλατεία Βάσω Κατράκη", latitude: 37.86341, longitude: 23.74732, lineIds: ["t7"] },
  { id: "tram-agg-metaxa", name: "Angelou Metaxa", nameEl: "Αγγέλου Μεταξά", latitude: 37.86277, longitude: 23.751175, lineIds: ["t7"] },
  { id: "tram-plateia-esperidon", name: "Plateia Esperidon", nameEl: "Πλατεία Εσπερίδων", latitude: 37.859, longitude: 23.753, lineIds: ["t7"] },
  { id: "tram-kolymvitirio", name: "Kolymvitirio", nameEl: "Κολυμβητήριο", latitude: 37.855, longitude: 23.755, lineIds: ["t7"] },
  { id: "tram-voula", name: "Asklipiio Voulas", nameEl: "Ασκληπιείο Βούλας", latitude: 37.8494, longitude: 23.7525, lineIds: ["t7"] },

];

const athensLines: TransitLine[] = [
  {
    id: "line1",
    name: "Line 1 (Green)",
    nameEl: "Γραμμή 1 (Πράσινη)",
    color: "#00853E",
    type: "metro",
    coordinates: [
      [23.6436, 37.9480], // Piraeus
      [23.6656, 37.9453], // Faliro
      [23.6809, 37.9556], // Moschato
      [23.6976, 37.9607], // Kallithea
      [23.7039, 37.9629], // Tavros
      [23.7095, 37.9688], // Petralona
      [23.7203, 37.9769], // Thissio
      [23.7254, 37.9760], // Monastiraki
      [23.7280, 37.9840], // Omonia
      [23.7305, 37.9932], // Victoria
      [23.7228, 37.9994], // Attiki
      [23.7276, 38.0068], // Agios Nikolaos
      [23.7287, 38.0115], // Kato Patissia
      [23.7311, 38.0172], // Agios Eleftherios
      [23.7351, 38.0210], // Ano Patissia
      [23.7448, 38.0329], // Perissos
      [23.7501, 38.0372], // Pefkakia
      [23.7549, 38.0416], // Nea Ionia
      [23.7663, 38.0463], // Iraklio
      [23.7835, 38.0435], // Irini
      [23.7929, 38.0452], // Neratziotissa
      [23.8022, 38.0562], // Maroussi
      [23.8042, 38.0662], // KAT
      [23.8083, 38.0733], // Kifissia
    ],
  },
  {
    id: "line2",
    name: "Line 2 (Red)",
    nameEl: "Γραμμή 2 (Κόκκινη)",
    color: "#DA291C",
    type: "metro",
    coordinates: [
      [23.6919, 38.0168], // Anthoupoli
      [23.6958, 38.0131], // Peristeri
      [23.7002, 38.0073], // Agios Antonios
      [23.7137, 38.0029], // Sepolia
      [23.7228, 37.9994], // Attiki
      [23.7207, 37.9924], // Larissa Station
      [23.7215, 37.9859], // Metaxourgio
      [23.7280, 37.9840], // Omonia
      [23.7332, 37.9804], // Panepistimio
      [23.7353, 37.9753], // Syntagma
      [23.7295, 37.9687], // Akropoli
      [23.7268, 37.9646], // Syngrou–Fix
      [23.7281, 37.9578], // Neos Kosmos
      [23.7343, 37.9566], // Agios Ioannis
      [23.7373, 37.9497], // Dafni
      [23.7408, 37.9404], // Agios Dimitrios
      [23.7446, 37.9297], // Ilioupoli
      [23.7446, 37.9182], // Alimos
      [23.7460, 37.9032], // Argyroupoli
      [23.7473, 37.8927], // Elliniko
    ],
  },
  {
    id: "line3",
    name: "Line 3 (Blue)",
    nameEl: "Γραμμή 3 (Μπλε)",
    color: "#0072CE",
    type: "metro",
    coordinates: [
      [23.6476, 37.9429], // Dimotiko Theatro
      [23.6436, 37.9480], // Piraeus
      [23.6399, 37.9596], // Maniatika
      [23.6474, 37.9659], // Nikaia
      [23.6506, 37.9772], // Korydallos
      [23.6595, 37.9901], // Agia Varvara
      [23.6681, 37.9970], // Agia Marina
      [23.6821, 37.9921], // Egaleo
      [23.6935, 37.9878], // Eleonas
      [23.7115, 37.9787], // Kerameikos
      [23.7254, 37.9760], // Monastiraki
      [23.7353, 37.9753], // Syntagma
      [23.7469, 37.9764], // Evangelismos
      [23.7539, 37.9788], // Megaro Moussikis
      [23.7602, 37.9910], // Ambelokipi
      [23.7668, 37.9929], // Panormou
      [23.7766, 37.9932], // Katehaki
      [23.7857, 38.0001], // Ethniki Amyna
      [23.7927, 38.0066], // Holargos
      [23.8054, 38.0094], // Nomismatokopio
      [23.8169, 38.0126], // Agia Paraskevi
      [23.8209, 38.0218], // Halandri
      [23.8239, 38.0233], // Doukissis Plakentias

      // Airport branch
      [23.8696, 38.0054], // Pallini
      [23.8789, 37.9837], // Paiania–Kantza
      [23.9122, 37.9130], // Koropi
      [23.9369, 37.9364], // Airport (Eleftherios Venizelos)
    ],
  },
  {
    id: "t6",
    name: "Tram T6 (Syntagma - Pikrodafni)",
    nameEl: "Τραμ T6 (Σύνταγμα - Πικροδάφνη)",
    color: "#E87722",
    type: "tram",
    coordinates: [
      [23.7353, 37.9753], // Syntagma
      [23.7379, 37.9686], // Zappeio
      [23.7318, 37.9667], // Leoforos Vouliagmenis
      [23.7268, 37.9646], // Fix
      [23.7235, 37.9604], // Kasomouli
      [23.7281, 37.9578], // Neos Kosmos
      [23.7225, 37.9547], // Baknana
      [23.7170, 37.9515], // Aegeou
      [23.7264, 37.9500], // Agia Fotini
      [23.7233, 37.9489], // Megalou Alexandrou
      [23.7199, 37.9481], // Agia Paraskevi
      [23.7158, 37.9467], // Medeas
      [23.7117, 37.9450], // Evangeliki
      [23.7072, 37.9428], // Achilleos
      [23.7033, 37.9403], // Amfitheas
      [23.6992, 37.9392], // Panagitsa
      [23.6950, 37.9360], // Mousson
      [23.70075, 37.91856], // Edem
      [23.705615, 37.91577], // Pikrodafni
    ],
  },
  {
    id: "t7",
    name: "Tram T7 (Piraeus - Voula)",
    nameEl: "Τραμ T7 (Πειραιάς - Βούλα)",
    color: "#E87722",
    type: "tram",
    coordinates: [
      // Loop
      [23.6655, 37.9442], // Neo Faliro
      [23.6481, 37.9356], // Mikras Asias
      [23.6461, 37.9422], // Dimarcheio
      [23.6450, 37.9475], // Agia Triada
      [23.6486, 37.9403], // Ippodameias
      [23.6511, 37.9367], // 34 Syntagma
      [23.6503, 37.9358], // Androutsou
      [23.6531, 37.9342], // Omiridou Skylitsi
      [23.6670, 37.9410], // SEF
      [23.6655, 37.9442], // Neo Faliro (Close Loop)

      // Coast
      [23.6690, 37.9450], // Moschato
      [23.6710, 37.9440], // Kallithea
      [23.6730, 37.9420], // Tzitzifies
      [23.67500, 37.94040], // Delta Falirou
      [23.6770, 37.9380], // Agia Skepi
      [23.6790, 37.9353], // Trocadero
      [23.68838, 37.92782], // Parko Flisvou
      [23.69289, 37.92336], // Flisvos
      [23.6974, 37.9300], // Batis
      [23.70075, 37.91856], // Edem
      [23.705615, 37.91577], // Pikrodafni
      [23.708605, 37.91312], // Marina Alimou
      [23.713045, 37.90956], // Kalamaki
      [23.71689, 37.906535], // Zefyros
      [23.71953, 37.90236], // Loutra Alimou
      [23.722, 37.898], // Elliniko
      [23.725, 37.892], // 1st Ag. Kosma
      [23.727, 37.889], // 2nd Ag. Kosma
      [23.7269, 37.8851], // Ag. Alexandros
      [23.7296, 37.881], // Ellinon Olymp
      [23.731905, 37.87576], // Kentro Istio
      [23.735055, 37.871556], // Vergoti
      [23.738585, 37.86764], // Glyfada
      [23.74337, 37.864545], // Paleo Dimarhio
      [23.74732, 37.86341], // Katraki
      [23.751175, 37.86277], // Agg Metaxa
      [23.753, 37.859], // Esperidon
      [23.755, 37.855], // Kolymvitirio
      [23.7525, 37.8494], // Voula
    ],
  },
];

// =============================================================================
// THESSALONIKI TRANSIT NETWORK
// =============================================================================

const thessalonikiStations: TransitStation[] = [
  // =========================================================================
  // LINE 1 (Blue) — Main line: New Railway Station to Nea Elvetia
  // =========================================================================
  { id: "thes-railway", name: "New Railway Station", nameEl: "Νέος Σιδηροδρομικός Σταθμός", latitude: 40.6436, longitude: 22.9292, lineIds: ["thessMetro", "thessWest"] },
  { id: "thes-dimokratias", name: "Dimokratias", nameEl: "Δημοκρατίας", latitude: 40.6411, longitude: 22.9342, lineIds: ["thessMetro", "thessWest"], isInterchange: true },
  { id: "thes-venizelou", name: "Venizelou", nameEl: "Βενιζέλου", latitude: 40.6372, longitude: 22.9419, lineIds: ["thessMetro"] },
  { id: "thes-ag-sofias", name: "Agia Sofia", nameEl: "Αγία Σοφία", latitude: 40.6344, longitude: 22.9464, lineIds: ["thessMetro"] },
  { id: "thes-sintrivani", name: "Sintrivani", nameEl: "Συντριβάνι", latitude: 40.6306, longitude: 22.9542, lineIds: ["thessMetro"] },
  { id: "thes-panepistimio", name: "Panepistimio", nameEl: "Πανεπιστήμιο", latitude: 40.6261, longitude: 22.9600, lineIds: ["thessMetro"] },
  { id: "thes-papafi", name: "Papafi", nameEl: "Παπάφη", latitude: 40.6197, longitude: 22.9625, lineIds: ["thessMetro"] },
  { id: "thes-efkleidis", name: "Efkleidis", nameEl: "Ευκλείδης", latitude: 40.6161, longitude: 22.9603, lineIds: ["thessMetro"] },
  { id: "thes-fleming", name: "Fleming", nameEl: "Φλέμινγκ", latitude: 40.6092, longitude: 22.9572, lineIds: ["thessMetro"] },
  { id: "thes-analipsi", name: "Analipsi", nameEl: "Ανάληψη", latitude: 40.6056, longitude: 22.9578, lineIds: ["thessMetro"] },
  { id: "thes-25martiou", name: "25 Martiou", nameEl: "25ης Μαρτίου", latitude: 40.6006, longitude: 22.9583, lineIds: ["thessMetro", "thessKalamaria"], isInterchange: true },
  { id: "thes-voulgari", name: "Voulgari", nameEl: "Βούλγαρη", latitude: 40.5944, longitude: 22.9608, lineIds: ["thessMetro"] },
  { id: "thes-nea-elvetia", name: "Nea Elvetia", nameEl: "Νέα Ελβετία", latitude: 40.5931, longitude: 22.9686, lineIds: ["thessMetro"] },

  // =========================================================================
  // LINE 2 (Light Blue) — Kalamaria Extension: 25 Martiou → Mikra
  // =========================================================================
  { id: "thes-nomarchia", name: "Nomarchia", nameEl: "Νομαρχία", latitude: 40.5914, longitude: 22.9569, lineIds: ["thessKalamaria"] },
  { id: "thes-kalamaria", name: "Kalamaria", nameEl: "Καλαμαριά", latitude: 40.5847, longitude: 22.9531, lineIds: ["thessKalamaria"] },
  { id: "thes-aretsou", name: "Aretsou", nameEl: "Αρετσού", latitude: 40.5778, longitude: 22.9575, lineIds: ["thessKalamaria"] },
  { id: "thes-nea-krini", name: "Nea Krini", nameEl: "Νέα Κρήνη", latitude: 40.5725, longitude: 22.9611, lineIds: ["thessKalamaria"] },
  { id: "thes-mikra", name: "Mikra", nameEl: "Μίκρα", latitude: 40.5683, longitude: 22.9658, lineIds: ["thessKalamaria"] },

  // =========================================================================
  // WESTERN EXTENSION (Orange) — Dimokratias → Papageorgiou Hospital
  // =========================================================================
  { id: "thes-neapoli", name: "Neapoli", nameEl: "Νεάπολη", latitude: 40.6475, longitude: 22.9220, lineIds: ["thessWest"] },
  { id: "thes-terpsithea", name: "Terpsithea", nameEl: "Τερψιθέα", latitude: 40.6530, longitude: 22.9140, lineIds: ["thessWest"] },
  { id: "thes-stavroupoli", name: "Stavroupoli", nameEl: "Σταυρούπολη", latitude: 40.6590, longitude: 22.9060, lineIds: ["thessWest"] },
  { id: "thes-polichni", name: "Polichni", nameEl: "Πολίχνη", latitude: 40.6728, longitude: 22.9389, lineIds: ["thessWest"] },
  { id: "thes-efkarpia", name: "Efkarpia", nameEl: "Ευκαρπία", latitude: 40.6810, longitude: 22.9310, lineIds: ["thessWest"] },
  { id: "thes-papageorgiou", name: "Papageorgiou Hospital", nameEl: "Νοσ. Παπαγεωργίου", latitude: 40.6870, longitude: 22.9250, lineIds: ["thessWest"] },
];

const thessalonikiLines: TransitLine[] = [
  {
    id: "thessMetro",
    name: "Line 1 (Blue)",
    nameEl: "Γραμμή 1 (Μπλε)",
    color: "#0072CE",
    type: "metro",
    coordinates: [
      [22.9292, 40.6436], // New Railway Station
      [22.9342, 40.6411], // Dimokratias
      [22.9419, 40.6372], // Venizelou
      [22.9464, 40.6344], // Ag. Sofia
      [22.9542, 40.6306], // Sintrivani
      [22.9600, 40.6261], // Panepistimio
      [22.9625, 40.6197], // Papafi
      [22.9603, 40.6161], // Efkleidis
      [22.9572, 40.6092], // Fleming
      [22.9578, 40.6056], // Analipsi
      [22.9583, 40.6006], // 25 Martiou
      [22.9608, 40.5944], // Voulgari
      [22.9686, 40.5931], // Nea Elvetia
    ],
  },
  {
    id: "thessKalamaria",
    name: "Line 2 (Kalamaria)",
    nameEl: "Γραμμή 2 (Καλαμαριά)",
    color: "#00BCD4",
    type: "metro",
    coordinates: [
      [22.9583, 40.6006], // 25 Martiou (branch)
      [22.9569, 40.5914], // Nomarchia
      [22.9531, 40.5847], // Kalamaria
      [22.9575, 40.5778], // Aretsou
      [22.9611, 40.5725], // Nea Krini
      [22.9658, 40.5683], // Mikra
    ],
  },
  {
    id: "thessWest",
    name: "Western Extension",
    nameEl: "Δυτική Επέκταση",
    color: "#FF9800",
    type: "metro",
    coordinates: [
      [22.9250, 40.6870], // Papageorgiou Hospital
      [22.9310, 40.6810], // Efkarpia
      [22.9389, 40.6728], // Polichni
      [22.9060, 40.6590], // Stavroupoli
      [22.9140, 40.6530], // Terpsithea
      [22.9220, 40.6475], // Neapoli
      [22.9342, 40.6411], // Dimokratias (junction)
      [22.9292, 40.6436], // New Railway Station
    ],
  },
];

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

export function getAthensTransitNetwork(): TransitNetwork {
  return {
    stations: athensStations,
    lines: athensLines,
  };
}

export function getThessalonikiTransitNetwork(): TransitNetwork {
  return {
    stations: thessalonikiStations,
    lines: thessalonikiLines,
  };
}

export function getTransitNetwork(city: "athens" | "thessaloniki"): TransitNetwork {
  return city === "athens" ? getAthensTransitNetwork() : getThessalonikiTransitNetwork();
}
