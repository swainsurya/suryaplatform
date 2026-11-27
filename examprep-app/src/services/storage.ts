import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StudentProfile,
  ExamSubmission,
  Exam,
  DeviceExamAttemptRecord,
  LiveCandidateSession,
} from '../types/exam';
import {
  fetchExamsFromFirebase,
  fetchExamByCodeFromFirebase,
  saveSubmissionToFirebase,
  saveLiveSessionToFirebase,
  deleteLiveSessionFromFirebase,
  normalizeExamCode,
} from './firebase';

const STORAGE_KEYS = {
  STUDENT_PROFILE: '@examprep_student_profile',
  REMEMBER_CREDS: '@examprep_remember_creds',
  SCORECARDS: '@examprep_scorecards',
  CUSTOM_EXAMS: '@examprep_custom_exams',
  DEVICE_ATTEMPTS: '@examprep_device_attempts',
  ACTIVE_SESSION: '@examprep_active_session',
};

export const defaultStudentProfile: StudentProfile = {
  name: 'Ananya Roy',
  rollNumber: '2024-CS-042',
  email: 'ananya.roy@engg.edu',
  department: 'B.Tech Computer Science & Engineering',
};

export const defaultMockExams: Exam[] = [
  {
    id: 'exam-surya-8291',
    code: 'SURYA-8291',
    title: 'CS-302: Design & Analysis of Algorithms',
    subject: 'Computer Science',
    description: 'Comprehensive mid-term evaluation covering Dynamic Programming, Greedy Methods, Graph Algorithms, and Asymptotic Complexity.',
    durationMinutes: 45,
    totalMarks: 20,
    passingPercentage: 40,
    negativeMarking: 0.5,
    enableAiProctoring: true,
    maxViolationsAllowed: 3,
    questions: [
      {
        id: 'algo-q1',
        questionText: 'What is the tightest asymptotic time complexity to compute the Longest Common Subsequence (LCS) of two strings of lengths m and n using 2D tabular Dynamic Programming?',
        options: [
          'O(m + n) time with O(1) auxiliary space',
          'O(m × n) time with O(m × n) space',
          'O(2^(m+n)) exponential recursion time',
          'O((m + n) log(m + n)) divide and conquer time'
        ],
        correctOptionIndex: 1,
        explanation: 'Tabular dynamic programming builds an (m+1) × (n+1) matrix where each cell lookup is evaluated in O(1) time. Thus, the overall running time is O(m × n).',
        marks: 2
      },
      {
        id: 'algo-q2',
        questionText: "Under which graph edge condition does Dijkstra's single-source shortest path algorithm fail to produce correct shortest distances?",
        options: [
          'Graphs containing negative weight edges',
          'Directed acyclic graphs with high positive edge weights',
          'Dense graphs with multiple directed cycles',
          'Unweighted connected graph components'
        ],
        correctOptionIndex: 0,
        explanation: "Dijkstra's greedy paradigm assumes that once a vertex distance is finalized, no subsequent relaxation can decrease it. Negative edge weights violate this invariant.",
        marks: 2
      },
      {
        id: 'algo-q3',
        questionText: 'Which algorithmic paradigm does the Floyd-Warshall all-pairs shortest path algorithm implement?',
        options: [
          'Greedy choice property with min-heap priority queue',
          'Divide and conquer with recursive subproblem partitioning',
          'Dynamic programming computing intermediate vertex relaxations',
          'Branch and bound with state space pruning'
        ],
        correctOptionIndex: 2,
        explanation: 'Floyd-Warshall iteratively checks whether paths between pairs of vertices can be improved using intermediate vertices {1..k} via dynamic programming in O(V^3) time.',
        marks: 2
      },
      {
        id: 'algo-q4',
        questionText: 'What is the worst-case upper bound time complexity of QuickSort when the naive first-element pivot selection is used on an already sorted array?',
        options: [
          'O(n log n)',
          'O(n²)',
          'O(n)',
          'O(log n)'
        ],
        correctOptionIndex: 1,
        explanation: 'On a sorted array with a first-element pivot, partitioning yields unbalanced subproblems of size 0 and n-1, leading to the recurrence T(n) = T(n-1) + O(n), which resolves to O(n²).',
        marks: 2
      },
      {
        id: 'algo-q5',
        questionText: "Which data structure allows Kruskal's minimum spanning tree algorithm to achieve an efficient O(E log V) running time?",
        options: [
          'Disjoint Set Union (Union-Find) with path compression and rank',
          'Fibonacci Heap with amortized decrease-key',
          'Self-Balancing Red-Black Binary Search Tree',
          'Breadth-First Search Queue with cycle detection'
        ],
        correctOptionIndex: 0,
        explanation: "Kruskal's algorithm sorts edges by weight and uses Disjoint Set Union (DSU) to check in near O(1) amortized time whether adding an edge introduces a cycle in the forest.",
        marks: 2
      },
      {
        id: 'algo-q6',
        questionText: 'In the 0/1 Knapsack problem with n items and total weight capacity W, what is the dynamic programming time complexity?',
        options: [
          'O(n log W)',
          'O(n × W) pseudo-polynomial time',
          'O(2ⁿ) polynomial time',
          'O(n² + W)'
        ],
        correctOptionIndex: 1,
        explanation: 'The state space is represented by dp[i][w] for 1 ≤ i ≤ n and 0 ≤ w ≤ W, resulting in an O(n × W) dynamic programming computation table, which is pseudo-polynomial.',
        marks: 2
      },
      {
        id: 'algo-q7',
        questionText: 'Which of the following computational decision problems belongs to class P and is NOT NP-Complete?',
        options: [
          'Traveling Salesperson Problem (Decision version)',
          'Boolean 3-Conjunctive Normal Form Satisfiability (3-SAT)',
          'Single-Source Shortest Path in Directed Graph with non-negative weights',
          'Vertex Cover Problem'
        ],
        correctOptionIndex: 2,
        explanation: 'Shortest path with positive weights is solvable in polynomial time O(E + V log V) using Dijkstra\'s algorithm and belongs to class P, whereas 3-SAT, TSP, and Vertex Cover are NP-Complete.',
        marks: 2
      },
      {
        id: 'algo-q8',
        questionText: 'What is the recurrence relation for standard MergeSort on an array of size n?',
        options: [
          'T(n) = 2T(n/2) + O(n)',
          'T(n) = T(n-1) + O(n)',
          'T(n) = 2T(n/2) + O(1)',
          'T(n) = 4T(n/2) + O(n²)'
        ],
        correctOptionIndex: 0,
        explanation: 'MergeSort divides the array into two halves 2T(n/2) and requires linear O(n) work to merge the two sorted halves back together.',
        marks: 2
      },
      {
        id: 'algo-q9',
        questionText: 'What is the average and worst-case time complexity for searching a key in a balanced Red-Black Tree with n nodes?',
        options: [
          'Average: O(1), Worst: O(n)',
          'Average: O(log n), Worst: O(log n)',
          'Average: O(log n), Worst: O(n)',
          'Average: O(n), Worst: O(n log n)'
        ],
        correctOptionIndex: 1,
        explanation: 'Red-Black trees maintain a maximum height of 2 * log₂(n + 1) through color flips and tree rotations, guaranteeing strictly O(log n) time in both average and worst cases.',
        marks: 2
      },
      {
        id: 'algo-q10',
        questionText: "What is the time complexity of the Bellman-Ford algorithm for finding shortest paths from a single source on a graph with V vertices and E edges?",
        options: [
          'O(V × E)',
          'O(V + E)',
          'O(E log V)',
          'O(V³)'
        ],
        correctOptionIndex: 0,
        explanation: 'Bellman-Ford relaxes all E edges (V - 1) times, resulting in an O(V × E) running time while accommodating negative edge weights and detecting negative cycles.',
        marks: 2
      }
    ]
  },
  {
    id: 'exam-react-101',
    code: 'REACT-101',
    title: 'CS-220: Modern Full Stack & React Engineering',
    subject: 'Web Technologies',
    description: 'Core evaluation on React Hooks, Virtual DOM reconciliation, state immutability, JSX transforms, and lifecycle effects.',
    durationMinutes: 30,
    totalMarks: 20,
    passingPercentage: 50,
    negativeMarking: 0.25,
    enableAiProctoring: true,
    maxViolationsAllowed: 3,
    questions: [
      {
        id: 'react-q1',
        questionText: 'Which React Hook is primarily designed to perform side effects such as fetching data, subscriptions, or manual DOM mutations?',
        options: [
          'useState',
          'useEffect',
          'useMemo',
          'useCallback'
        ],
        correctOptionIndex: 1,
        explanation: 'useEffect serves the purpose of executing side effects in functional components, running after DOM render updates have been committed.',
        marks: 2
      },
      {
        id: 'react-q2',
        questionText: 'What is the primary architectural purpose of the Virtual DOM and React Reconciliation?',
        options: [
          'To directly manipulate browser DOM nodes synchronously on every micro-state change',
          'To batch and minimize expensive browser layout calculations and repaints through heuristic diffing',
          'To encrypt sensitive client-side application state variables before transmission',
          'To bypass HTML and CSS rendering engines entirely within browser tabs'
        ],
        correctOptionIndex: 1,
        explanation: 'The Virtual DOM maintains an in-memory representation of UI elements and uses the Fiber reconciliation diffing algorithm to perform the minimal set of real DOM mutations.',
        marks: 2
      },
      {
        id: 'react-q3',
        questionText: 'Why is mutating component props directly considered an anti-pattern in React?',
        options: [
          'Props are strictly read-only to guarantee predictable unidirectional data flow from parent to child',
          'Direct mutations throw native browser JavaScript engine syntax errors',
          'Direct props mutations cause WebSocket network disconnections',
          'React freezes all device RAM whenever a prop is modified'
        ],
        correctOptionIndex: 0,
        explanation: 'Props belong to the parent component. Mutating them in children breaks pure component guarantees, unidirectional data flow, and predictable re-rendering.',
        marks: 2
      },
      {
        id: 'react-q4',
        questionText: 'When rendering dynamic lists in React, why is providing a unique and stable "key" prop critical?',
        options: [
          'It provides an index number for CSS styling pseudo-classes',
          'It enables the reconciliation engine to identify which items were inserted, removed, or reordered efficiently',
          'It is required by the browser accessibility tree to read elements aloud',
          'It establishes an encrypted hash for local storage persistence'
        ],
        correctOptionIndex: 1,
        explanation: 'Keys allow React to match existing child elements during reconciliation diffing across renders, avoiding unnecessary DOM re-creations and state loss.',
        marks: 2
      },
      {
        id: 'react-q5',
        questionText: 'How should cleanup logic for timers or subscriptions be handled inside a useEffect hook?',
        options: [
          'By invoking window.clearInterval at the end of the root render function',
          'By returning a cleanup function from within the useEffect callback',
          'By passing a boolean flag "clean: true" inside the dependency array',
          'By attaching an unmount handler directly to document.body'
        ],
        correctOptionIndex: 1,
        explanation: 'React invokes the function returned from useEffect during component unmount and before re-running the effect on dependency changes.',
        marks: 2
      },
      {
        id: 'react-q6',
        questionText: 'What is the primary difference between useMemo and useCallback?',
        options: [
          'useMemo caches a computed value; useCallback caches a memoized function reference',
          'useMemo runs asynchronously; useCallback runs synchronously',
          'useMemo can only be used with primitive numbers; useCallback is for objects',
          'useMemo persists data across browser reloads; useCallback does not'
        ],
        correctOptionIndex: 0,
        explanation: 'useMemo(() => compute(), deps) memoizes the calculated result, while useCallback(fn, deps) memoizes the callback function reference itself to prevent child re-renders.',
        marks: 2
      },
      {
        id: 'react-q7',
        questionText: 'Which built-in React component lifecycle allows catching JavaScript errors in child component trees to display a fallback UI?',
        options: [
          'Suspense Boundary',
          'Error Boundary implementing componentDidCatch or static getDerivedStateFromError',
          'Strict Mode Provider',
          'Profiler Container'
        ],
        correctOptionIndex: 1,
        explanation: 'Error Boundaries are class components implementing componentDidCatch and/or static getDerivedStateFromError to catch unhandled errors in child component trees.',
        marks: 2
      },
      {
        id: 'react-q8',
        questionText: 'What happens when calling a state setter function with the same identical primitive value (Object.is comparison) as the current state?',
        options: [
          'React forces a recursive re-render cycle',
          'React bails out of re-rendering the component and its children',
          'React throws a Warning: Infinite loop exception',
          'React resets the state to null'
        ],
        correctOptionIndex: 1,
        explanation: 'React uses Object.is algorithm to compare new state with current state; if equal, it bails out of rendering children or firing effects.',
        marks: 2
      },
      {
        id: 'react-q9',
        questionText: 'In modern React 18 and 19, what mechanism enables non-urgent state updates to be deferred so high-priority user input remains responsive?',
        options: [
          'Web Workers thread isolation',
          'startTransition and useTransition hooks',
          'requestIdleCallback polyfill in Redux',
          'setTimeout with 0ms delay'
        ],
        correctOptionIndex: 1,
        explanation: 'startTransition marks state updates as transitions, allowing React to interrupt them if higher-priority events like user typing or clicking occur.',
        marks: 2
      },
      {
        id: 'react-q10',
        questionText: 'Why should you NOT call React Hooks inside regular JavaScript loops, conditions, or nested functions?',
        options: [
          'Hooks rely on identical call ordering on every render to map state to internal Fiber linked lists',
          'JavaScript loops prevent garbage collection of closure variables',
          'Browsers limit the maximum stack depth of functions called "use"',
          'Loops cause automatic JSON serialization failures'
        ],
        correctOptionIndex: 0,
        explanation: 'React relies on call order across renders to correctly preserve state between multiple useState/useEffect calls on the internal Fiber node.',
        marks: 2
      }
    ]
  },
  {
    id: 'exam-os-202',
    code: 'OS-202',
    title: 'CS-204: Operating Systems & Kernel Architecture',
    subject: 'Computer Science',
    description: 'System-level evaluation on Process Synchronization, Virtual Memory Paging, Deadlocks, Scheduling, and Storage Inodes.',
    durationMinutes: 40,
    totalMarks: 20,
    passingPercentage: 40,
    negativeMarking: 0.5,
    enableAiProctoring: true,
    maxViolationsAllowed: 3,
    questions: [
      {
        id: 'os-q1',
        questionText: 'Which four necessary conditions must hold simultaneously for a system deadlock to occur (Coffman conditions)?',
        options: [
          'Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait',
          'Virtual Paging, Semaphore Locking, Context Switching, Preemption',
          'Race Conditions, Inode Contention, Starvation, Thrashing',
          'Process Forking, Kernel Mode, Memory Swapping, Non-reentrancy'
        ],
        correctOptionIndex: 0,
        explanation: 'The four Coffman conditions are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Breaking any one prevents deadlock.',
        marks: 2
      },
      {
        id: 'os-q2',
        questionText: "What algorithm does an operating system use in a deadlock avoidance scheme when process resource maximum claim matrices are known beforehand?",
        options: [
          "Dijkstra's Banker's Algorithm",
          "Kruskal's Resource Algorithm",
          "Peterson's Spinlock",
          "Round-Robin Quantum Scheduler"
        ],
        correctOptionIndex: 0,
        explanation: "The Banker's Algorithm tests for safety by simulating resource allocation for predetermined maximum claims before deciding whether granting a request keeps the system in a safe state.",
        marks: 2
      },
      {
        id: 'os-q3',
        questionText: 'What phenomenon occurs when a computer spends more time transferring pages between physical RAM and disk swap than executing instructions?',
        options: [
          'Belady’s Anomaly',
          'Thrashing',
          'Starvation',
          'Priority Inversion'
        ],
        correctOptionIndex: 1,
        explanation: 'Thrashing occurs when the total working sets of active processes exceed available physical memory frames, causing continuous high-rate page faults.',
        marks: 2
      },
      {
        id: 'os-q4',
        questionText: "Which page replacement algorithm suffers from Belady's Anomaly, where increasing the number of page frames results in more page faults?",
        options: [
          'Least Recently Used (LRU)',
          'First-In, First-Out (FIFO)',
          'Optimal Page Replacement (OPT)',
          'Least Frequently Used with Aging (LFU)'
        ],
        correctOptionIndex: 1,
        explanation: 'FIFO is not a stack-based replacement algorithm. For certain reference strings, adding more physical memory frames increases the total number of page faults.',
        marks: 2
      },
      {
        id: 'os-q5',
        questionText: 'What is the purpose of the Translation Lookaside Buffer (TLB) in modern Memory Management Units (MMU)?',
        options: [
          'To cache page table translations from Virtual Page Numbers to Physical Frame Numbers',
          'To translate high-level C code directly into machine assembly instructions',
          'To queue pending interrupt requests from USB peripheral devices',
          'To store cryptographic disk encryption keys in silicon'
        ],
        correctOptionIndex: 0,
        explanation: 'The TLB is a fast hardware associative cache that stores recent virtual-to-physical address mappings, avoiding slow multi-level page table memory traversals.',
        marks: 2
      },
      {
        id: 'os-q6',
        questionText: 'What CPU scheduling metric is defined as the elapsed time from process submission to its complete termination?',
        options: [
          'Response Time',
          'Turnaround Time',
          'Waiting Time',
          'Throughput'
        ],
        correctOptionIndex: 1,
        explanation: 'Turnaround Time = Completion Time - Arrival Time. It represents the total interval spent by a process in ready, running, and I/O waiting states.',
        marks: 2
      },
      {
        id: 'os-q7',
        questionText: 'In Unix-like file systems, what critical metadata information is NOT stored inside an inode?',
        options: [
          'File size in bytes',
          'Owner User ID (UID) and permissions',
          'The file name',
          'Pointers to direct and indirect data disk blocks'
        ],
        correctOptionIndex: 2,
        explanation: 'Inodes store permissions, ownership, timestamps, and block pointers, but the file name is stored in the directory entry (which maps filenames to inode numbers).',
        marks: 2
      },
      {
        id: 'os-q8',
        questionText: 'What synchronization primitive consists of an integer value accessed only through atomic wait (P) and signal (V) operations?',
        options: [
          'Mutex Lock with spin timeout',
          'Counting Semaphore',
          'Conditional Barrier',
          'Message Passing Mailbox'
        ],
        correctOptionIndex: 1,
        explanation: 'Counting semaphores maintain an integer value that is decremented atomically by wait()/P() and incremented atomically by signal()/V().',
        marks: 2
      },
      {
        id: 'os-q9',
        questionText: 'What problem occurs when a lower-priority task holds a shared lock needed by a high-priority task, and an intermediate-priority task preempts the low-priority task?',
        options: [
          'Priority Inversion',
          'Race Condition',
          'Livelock',
          'Belady’s Inversion'
        ],
        correctOptionIndex: 0,
        explanation: 'Priority Inversion occurs when a high-priority thread is indirectly blocked by a medium-priority thread preempting a low-priority lock holder. It is mitigated using Priority Inheritance.',
        marks: 2
      },
      {
        id: 'os-q10',
        questionText: 'What happens during a CPU context switch between two user processes?',
        options: [
          'The CPU saves registers and Program Counter of the active process, updates memory maps, and restores state of the next ready process',
          'The CPU reboots the motherboard kernel subsystem',
          'The disk drive flushes all caches to non-volatile flash',
          'The OS creates a new system call interrupt vector table from scratch'
        ],
        correctOptionIndex: 0,
        explanation: 'A context switch saves the CPU register state, Program Counter, and stack pointers of the departing process into its Process Control Block (PCB) and loads the corresponding state of the incoming process.',
        marks: 2
      }
    ]
  },
  {
    id: 'exam-net-401',
    code: 'NET-401',
    title: 'CS-305: Computer Networks & Cloud Protocols',
    subject: 'Computer Science',
    description: 'Protocol analysis spanning TCP Congestion Control, DNS Hierarchy, Subnetting CIDR, TLS Handshakes, and HTTP/2 Multiplexing.',
    durationMinutes: 35,
    totalMarks: 20,
    passingPercentage: 45,
    negativeMarking: 0.25,
    enableAiProctoring: true,
    maxViolationsAllowed: 3,
    questions: [
      {
        id: 'net-q1',
        questionText: 'What is the exact sequence of flag packets exchanged during a standard TCP connection establishment (3-way handshake)?',
        options: [
          'SYN → SYN-ACK → ACK',
          'ACK → SYN → ACK-SYN',
          'FIN → FIN-ACK → ACK',
          'RST → SYN → ACK'
        ],
        correctOptionIndex: 0,
        explanation: 'Client sends SYN, server responds with SYN-ACK, and client acknowledges with ACK to establish a reliable full-duplex TCP socket.',
        marks: 2
      },
      {
        id: 'net-q2',
        questionText: 'In IPv4 subnetting with CIDR notation /26, how many usable host IP addresses are available in each subnet?',
        options: [
          '64 hosts',
          '62 usable hosts (64 total minus Network and Broadcast)',
          '32 usable hosts',
          '128 hosts'
        ],
        correctOptionIndex: 1,
        explanation: 'A /26 mask leaves 32 - 26 = 6 host bits, yielding 2^6 = 64 total addresses. Subtracting 2 (network address and broadcast address) yields 62 usable host addresses.',
        marks: 2
      },
      {
        id: 'net-q3',
        questionText: 'What major limitation of HTTP/1.1 pipelining does HTTP/2 solve by using binary framing and single-connection multiplexing?',
        options: [
          'SSL Certificate revocation check latency',
          'Head-of-Line (HoL) blocking at the HTTP application layer',
          'Maximum transmission unit packet fragmentation',
          'DNS root server query timeouts'
        ],
        correctOptionIndex: 1,
        explanation: 'In HTTP/1.1, if a response is slow, subsequent responses on the same TCP connection are stalled. HTTP/2 interleaves binary request and response frames concurrently over one connection.',
        marks: 2
      },
      {
        id: 'net-q4',
        questionText: 'Which layer of the OSI model does the Address Resolution Protocol (ARP) primarily bridge?',
        options: [
          'Application Layer (Layer 7) to Transport Layer (Layer 4)',
          'Network Layer (Layer 3 IPv4) to Data Link Layer (Layer 2 MAC)',
          'Session Layer (Layer 5) to Presentation Layer (Layer 6)',
          'Physical Layer (Layer 1) to Transport Layer (Layer 4)'
        ],
        correctOptionIndex: 1,
        explanation: 'ARP translates a known 32-bit IPv4 address into a 48-bit physical Ethernet MAC address on the local broadcast link.',
        marks: 2
      },
      {
        id: 'net-q5',
        questionText: 'What cryptographic speed enhancement did TLS 1.3 introduce over TLS 1.2 during session handshakes?',
        options: [
          'Eliminated symmetric encryption keys entirely',
          'Reduced standard handshake latency from 2 Round Trip Times (RTT) to 1-RTT (and 0-RTT for resumption)',
          'Removed public key certificates in favor of plain text passwords',
          'Replaced TCP with UDP for all payloads unconditionally'
        ],
        correctOptionIndex: 1,
        explanation: 'TLS 1.3 simplified cipher suites and sends Diffie-Hellman key shares in the initial ClientHello, cutting full handshake latency to 1 RTT and supporting 0-RTT session resumption.',
        marks: 2
      }
    ]
  }
];

export const defaultMockScorecards: ExamSubmission[] = [
  {
    id: 'sub-surya-8291',
    examId: 'exam-surya-8291',
    examCode: 'SURYA-8291',
    examTitle: 'CS-302: Design & Analysis of Algorithms',
    studentName: 'Ananya Roy',
    studentRollNumber: '2024-CS-042',
    studentEmail: 'ananya.roy@engg.edu',
    submittedAt: 'Today, 10:45 AM',
    timeTakenSeconds: 2160,
    totalQuestions: 10,
    attemptedCount: 10,
    correctCount: 9,
    wrongCount: 1,
    skippedCount: 0,
    totalScore: 17.5,
    maxScore: 20,
    percentage: 87.5,
    isPassed: true,
    violationsCount: 0,
    answers: [
      { questionId: 'algo-q1', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q2', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q3', selectedOptionIndex: 2, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q4', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q5', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q6', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q7', selectedOptionIndex: 2, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q8', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q9', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'algo-q10', selectedOptionIndex: 2, isCorrect: false, marksAwarded: -0.5 },
    ]
  },
  {
    id: 'sub-react-101',
    examId: 'exam-react-101',
    examCode: 'REACT-101',
    examTitle: 'CS-220: Modern Full Stack & React Engineering',
    studentName: 'Ananya Roy',
    studentRollNumber: '2024-CS-042',
    studentEmail: 'ananya.roy@engg.edu',
    submittedAt: 'Yesterday, 3:15 PM',
    timeTakenSeconds: 1420,
    totalQuestions: 10,
    attemptedCount: 9,
    correctCount: 8,
    wrongCount: 1,
    skippedCount: 1,
    totalScore: 15.75,
    maxScore: 20,
    percentage: 78.8,
    isPassed: true,
    violationsCount: 0,
    answers: [
      { questionId: 'react-q1', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'react-q2', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'react-q3', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'react-q4', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'react-q5', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'react-q6', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'react-q7', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'react-q8', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'react-q9', selectedOptionIndex: 0, isCorrect: false, marksAwarded: -0.25 },
      { questionId: 'react-q10', selectedOptionIndex: null, isCorrect: false, marksAwarded: 0 },
    ]
  },
  {
    id: 'sub-os-202',
    examId: 'exam-os-202',
    examCode: 'OS-202',
    examTitle: 'CS-204: Operating Systems & Kernel Architecture',
    studentName: 'Ananya Roy',
    studentRollNumber: '2024-CS-042',
    studentEmail: 'ananya.roy@engg.edu',
    submittedAt: 'Nov 18, 2026',
    timeTakenSeconds: 1980,
    totalQuestions: 10,
    attemptedCount: 10,
    correctCount: 9,
    wrongCount: 1,
    skippedCount: 0,
    totalScore: 17.5,
    maxScore: 20,
    percentage: 87.5,
    isPassed: true,
    violationsCount: 0,
    answers: [
      { questionId: 'os-q1', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q2', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q3', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q4', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q5', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q6', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q7', selectedOptionIndex: 2, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q8', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q9', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 2 },
      { questionId: 'os-q10', selectedOptionIndex: 1, isCorrect: false, marksAwarded: -0.5 },
    ]
  }
];

export async function getStudentProfile(): Promise<StudentProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDENT_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading student profile:', e);
  }
  return defaultStudentProfile;
}

export async function saveStudentProfile(profile: StudentProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving student profile:', e);
  }
}

export async function getRememberCreds(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_CREDS);
    return raw !== null ? JSON.parse(raw) : true;
  } catch {
    return true;
  }
}

export async function setRememberCreds(val: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_CREDS, JSON.stringify(val));
  } catch (e) {
    console.error('Error saving remember creds:', e);
  }
}

/**
 * Checks if this exam has already been submitted on this device
 */
export async function isExamAttemptedOnDevice(examId: string, examCode?: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ATTEMPTS);
    if (!raw) return false;
    const records = JSON.parse(raw) as Record<string, DeviceExamAttemptRecord>;
    if (records[examId]) return true;
    if (examCode && records[examCode.toUpperCase()]) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Retrieves the device attempt record for an exam
 */
export async function getDeviceExamAttempt(
  examId: string,
  examCode?: string
): Promise<DeviceExamAttemptRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ATTEMPTS);
    if (!raw) return null;
    const records = JSON.parse(raw) as Record<string, DeviceExamAttemptRecord>;
    return records[examId] || (examCode ? records[examCode.toUpperCase()] : null) || null;
  } catch {
    return null;
  }
}

/**
 * Records that an exam has been attempted and submitted on this device
 */
export async function recordExamAttemptOnDevice(
  examId: string,
  submissionId: string,
  examCode?: string,
  studentName?: string
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ATTEMPTS);
    const records: Record<string, DeviceExamAttemptRecord> = raw ? JSON.parse(raw) : {};
    const entry: DeviceExamAttemptRecord = {
      submissionId,
      submittedAt: new Date().toISOString(),
      examCode: examCode?.toUpperCase(),
      studentName,
    };
    records[examId] = entry;
    if (examCode) {
      records[examCode.toUpperCase()] = entry;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ATTEMPTS, JSON.stringify(records));
  } catch (err) {
    console.warn('Could not record exam attempt on device:', err);
  }
}

/**
 * Clear device attempt record for an exam
 */
export async function clearDeviceExamAttempt(examId: string, examCode?: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ATTEMPTS);
    if (!raw) return;
    const records = JSON.parse(raw) as Record<string, DeviceExamAttemptRecord>;
    delete records[examId];
    if (examCode) {
      delete records[examCode.toUpperCase()];
    }
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ATTEMPTS, JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Fetches all available exams: Firestore cloud exams + cached + default mocks
 */
export async function getAllAvailableExams(): Promise<Exam[]> {
  try {
    // Try fetching from Firestore first
    const remoteExams = await fetchExamsFromFirebase();
    if (remoteExams && remoteExams.length > 0) {
      // Cache remote exams in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_EXAMS, JSON.stringify(remoteExams));
      return remoteExams;
    }

    // Fallback to cached exams in AsyncStorage
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EXAMS);
    if (raw) {
      const customExams: Exam[] = JSON.parse(raw);
      if (Array.isArray(customExams) && customExams.length > 0) {
        return customExams;
      }
    }
  } catch (e) {
    console.error('Error reading available exams:', e);
  }
  return defaultMockExams;
}

/**
 * Look up exam by code: checks local store first, then queries Firestore directly
 */
export async function getExamByCode(code: string): Promise<Exam | undefined> {
  const clean = normalizeExamCode(code);
  if (!clean) return undefined;

  // 1. Check local list
  const all = await getAllAvailableExams();
  const localMatch = all.find((e) => {
    const eCode = (e.code || '').toUpperCase();
    const eId = (e.id || '').toUpperCase();
    return (
      eCode === clean ||
      eId === clean ||
      (clean.length >= 4 && eCode.endsWith(clean)) ||
      (clean.startsWith('EXAM-') && eCode === clean.replace('EXAM-', '')) ||
      (/^\d+$/.test(clean) && eCode === `EXAM-${clean}`)
    );
  });
  if (localMatch) return localMatch;

  // 2. Query Firestore directly
  const remoteMatch = await fetchExamByCodeFromFirebase(clean);
  if (remoteMatch) {
    // Cache it into local storage
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EXAMS);
      const list: Exam[] = raw ? JSON.parse(raw) : [];
      if (!list.some((e) => e.id === remoteMatch.id)) {
        list.unshift(remoteMatch);
        await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_EXAMS, JSON.stringify(list));
      }
    } catch {}
    return remoteMatch;
  }

  return undefined;
}

export async function getExamById(id: string): Promise<Exam | undefined> {
  const all = await getAllAvailableExams();
  const found = all.find((e) => e.id === id);
  if (found) return found;

  const remote = await fetchExamByCodeFromFirebase(id);
  return remote || undefined;
}

export async function getRecentScorecards(): Promise<ExamSubmission[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCORECARDS);
    if (raw) {
      const stored: ExamSubmission[] = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        return stored;
      }
    }
  } catch (e) {
    console.error('Error reading scorecards:', e);
  }
  return defaultMockScorecards;
}

/**
 * Save scorecard: saves to AsyncStorage AND submits to Firestore
 */
export async function saveScorecard(submission: ExamSubmission): Promise<void> {
  try {
    // 1. Save locally
    const currentList = await getRecentScorecards();
    const updated = [submission, ...currentList.filter((s) => s.id !== submission.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.SCORECARDS, JSON.stringify(updated));

    // 2. Record single-attempt device lock
    await recordExamAttemptOnDevice(
      submission.examId,
      submission.id,
      submission.examCode,
      submission.studentName
    );

    // 3. Save to Firebase Cloud Firestore
    await saveSubmissionToFirebase(submission);
  } catch (e) {
    console.error('Error saving scorecard:', e);
  }
}

/**
 * Live candidate session management for Firestore attendance tracking
 */
export async function registerLiveCandidateSession(session: LiveCandidateSession): Promise<void> {
  try {
    await saveLiveSessionToFirebase(session);
  } catch (err) {
    console.warn('Live session registration notice:', err);
  }
}

export async function updateLiveCandidateHeartbeat(
  session: LiveCandidateSession
): Promise<void> {
  try {
    await saveLiveSessionToFirebase(session);
  } catch (err) {
    console.warn('Live session heartbeat notice:', err);
  }
}

export async function unregisterLiveCandidateSession(sessionId: string): Promise<void> {
  try {
    await deleteLiveSessionFromFirebase(sessionId);
  } catch (err) {
    console.warn('Live session cleanup notice:', err);
  }
}

